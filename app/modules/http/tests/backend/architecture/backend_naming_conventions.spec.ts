import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { test } from '@japa/runner'

const APP_MODULES_ROOT = 'app/modules'
const BACKEND_NAMING_EXCEPTION_DOC = 'docs/08-testing/backend-naming-exceptions.md'

const DOCUMENTED_MODULE_LOCAL_PRIMITIVES = [
  // Module-local architecture primitives are allowed only when documented in backend-naming-exceptions.md.
  'BaseCommand',
  'BaseQuery',
  'Command',
  'Query',
  'Result',
]

const DOCUMENTED_VERSIONED_WRAPPER_EXPORTS = [
  // Versioned/current wrapper exports may share names only when path or class suffix provides route context.
  'CreateTaskStatusController',
  'ShowSettingsController',
  'ReplaceTaskWorkflowTransitionsV1Controller',
]

const DOCUMENTED_FRAMEWORK_FILENAMES = [
  // Framework filenames are allowed only when the directory path carries the domain intent.
  'index.ts',
  'routes.ts',
  'middleware.ts',
  'handler.ts',
]

const SPRINT_BUSINESS_EXPORTS = [
  'CreateProjectSprintCommand',
  'UpdateProjectSprintCommand',
  'ListProjectSprintsQuery',
  'GetProjectSprintQuery',
  'CreateProjectSprintController',
  'UpdateProjectSprintController',
  'ListProjectSprintsController',
  'ShowProjectSprintController',
]

function deprecatedName(...parts: string[]): string {
  return parts.join('')
}

function deprecatedNamePattern(...parts: string[]): RegExp {
  return new RegExp(`\\b${deprecatedName(...parts)}\\b`, 'g')
}

const MISLEADING_SYMBOL_PATTERNS = [
  {
    name: deprecatedName('Store', 'ProjectController'),
    pattern: deprecatedNamePattern('Store', 'ProjectController'),
    reason: 'project creation controller orchestrates staffing and role setup',
  },
  {
    name: deprecatedName('Update', 'WorkflowCommand'),
    pattern: deprecatedNamePattern('Update', 'WorkflowCommand'),
    reason: 'command replaces task workflow transitions',
  },
  {
    name: deprecatedName('Update', 'WorkflowController'),
    pattern: deprecatedNamePattern('Update', 'WorkflowController'),
    reason: 'controller replaces task workflow transitions',
  },
  {
    name: deprecatedName('Show', 'SprintManagementController'),
    pattern: deprecatedNamePattern('Show', 'SprintManagementController'),
    reason: 'controller renders the organization sprints workspace',
  },
  {
    name: deprecatedName('Task', 'ApplicationMapper'),
    pattern: deprecatedNamePattern('Task', 'ApplicationMapper'),
    reason: 'mapper handles task DTO/entity/response mapping, not task applications',
  },
  {
    name: deprecatedName('Create', 'ProjectDTOInterface'),
    pattern: deprecatedNamePattern('Create', 'ProjectDTOInterface'),
    reason: 'interface describes project creation input',
  },
  {
    name: deprecatedName('check', 'ProjectPermission'),
    pattern: deprecatedNamePattern('check', 'ProjectPermission'),
    reason: 'function throws on denial and returns the authorized user id',
  },
]

const GENERIC_HELPER_FILES = [
  'app/modules/projects/controllers/mappers/request/shared.ts',
  'app/modules/tasks/infra/repositories/read/shared.ts',
]

interface SourceFile {
  path: string
  content: string
}

interface NamingViolation {
  file: string
  line: number
  name: string
  reason: string
}

function walkFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry)
    const stats = statSync(entryPath)

    if (stats.isDirectory()) {
      return walkFiles(entryPath)
    }

    return [entryPath]
  })
}

function isProductionTypeScriptFile(filePath: string): boolean {
  return filePath.endsWith('.ts') && !filePath.includes('/tests/')
}

function readProductionFiles(root: string): SourceFile[] {
  return walkFiles(root)
    .filter(isProductionTypeScriptFile)
    .map((filePath) => ({
      path: filePath,
      content: readFileSync(filePath, 'utf8'),
    }))
}

function lineNumberForIndex(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

function findPatternViolations(
  files: SourceFile[],
  patterns: typeof MISLEADING_SYMBOL_PATTERNS
): NamingViolation[] {
  return files.flatMap((file) =>
    patterns.flatMap((pattern) => {
      const matches = [...file.content.matchAll(pattern.pattern)]

      return matches.map((match) => ({
        file: file.path,
        line: lineNumberForIndex(file.content, match.index),
        name: pattern.name,
        reason: pattern.reason,
      }))
    })
  )
}

function exportedClassNames(file: SourceFile): Set<string> {
  const names = new Set<string>()

  for (const match of file.content.matchAll(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g)) {
    const [, className] = match
    if (className) {
      names.add(className)
    }
  }

  for (const match of file.content.matchAll(/export\s+class\s+([A-Za-z0-9_]+)/g)) {
    const [, className] = match
    if (className) {
      names.add(className)
    }
  }

  return names
}

function findDuplicateSprintBusinessExports(files: SourceFile[]): NamingViolation[] {
  return SPRINT_BUSINESS_EXPORTS.flatMap((exportName) => {
    const owners = files.filter((file) => exportedClassNames(file).has(exportName))
    const hasSprintOwner = owners.some((file) => file.path.startsWith('app/modules/sprints/'))
    const duplicateReviewOwners = owners.filter((file) => file.path.startsWith('app/modules/reviews/'))

    if (!hasSprintOwner || duplicateReviewOwners.length === 0) {
      return []
    }

    return duplicateReviewOwners.map((file) => ({
      file: file.path,
      line: lineNumberForIndex(file.content, file.content.indexOf(exportName)),
      name: exportName,
      reason: 'sprint CRUD business exports must have one canonical owner in app/modules/sprints',
    }))
  })
}

function findGenericSharedFiles(files: SourceFile[]): NamingViolation[] {
  return files
    .filter(
      (file) =>
        GENERIC_HELPER_FILES.includes(file.path) ||
        /\/controllers\/(?:current\/)?mappers\/response\/shared\.ts$/.test(file.path)
    )
    .map((file) => ({
      file: file.path,
      line: 1,
      name: 'shared.ts',
      reason: 'helper filenames must name the request parsing, read query, or response serialization intent',
    }))
}

function findResponseSerializationNameViolations(files: SourceFile[]): NamingViolation[] {
  return files
    .filter((file) => /\/controllers\/(?:current\/)?mappers\/response\/shared\.ts$/.test(file.path))
    .flatMap((file) =>
      findPatternViolations([file], [
        {
          name: deprecatedName('Response', 'Record'),
          pattern: deprecatedNamePattern('Response', 'Record'),
          reason: 'response serialization records should use model serialization names',
        },
        {
          name: deprecatedName('Serializable', 'Response', 'Record'),
          pattern: deprecatedNamePattern('Serializable', 'Response', 'Record'),
          reason: 'response serialization records should use model serialization names',
        },
      ])
    )
}

function findUndocumentedExceptionTerms(): NamingViolation[] {
  const documentation = readFileSync(BACKEND_NAMING_EXCEPTION_DOC, 'utf8')
  const documentedTerms = [
    ...DOCUMENTED_MODULE_LOCAL_PRIMITIVES,
    ...DOCUMENTED_VERSIONED_WRAPPER_EXPORTS,
    ...DOCUMENTED_FRAMEWORK_FILENAMES,
  ]

  return documentedTerms
    .filter((term) => !documentation.includes(term))
    .map((term) => ({
      file: BACKEND_NAMING_EXCEPTION_DOC,
      line: 1,
      name: term,
      reason: 'backend naming exception appears in guard but is missing from docs',
    }))
}

test.group('Backend naming conventions', () => {
  test('backend production names expose intent without duplicate ownership', ({ assert }) => {
    const files = readProductionFiles(APP_MODULES_ROOT)
    const violations = [
      ...findDuplicateSprintBusinessExports(files),
      ...findPatternViolations(files, MISLEADING_SYMBOL_PATTERNS),
      ...findGenericSharedFiles(files),
      ...findResponseSerializationNameViolations(files),
      ...findUndocumentedExceptionTerms(),
    ]

    assert.deepEqual(violations, [])
  })
})
