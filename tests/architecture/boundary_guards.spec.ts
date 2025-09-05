import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

interface ImportViolation {
  file: string
  line: number
  specifier: string
  reason?: string
}

interface BaselineViolation {
  file: string
  import_path: string
  reason: string
}

function countRgMatches(pattern: string, paths: string[]): number {
  try {
    const output = execFileSync(
      'rg',
      [pattern, ...paths, '--glob', '*.ts', '--count'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => {
        const count = Number.parseInt(line.split(':').pop() ?? '0', 10)
        return Number.isNaN(count) ? sum : sum + count
      }, 0)
  } catch {
    return 0
  }
}

function readBoundaryBaseline(): Set<string> {
  const path = 'docs/architecture/generated/boundary_violations_baseline.json'
  if (!existsSync(path)) return new Set()

  const content = readFileSync(path, 'utf8')
  const violations = JSON.parse(content) as BaselineViolation[]

  return new Set(violations.map((violation) => `${violation.file}:${violation.import_path}`))
}

function moduleNameFromPath(path: string): string | null {
  const match = /^app\/modules\/([^/]+)\//.exec(path)
  return match?.[1] ?? null
}

function importedModule(specifier: string): string | null {
  const match = /^#modules\/([^/]+)\//.exec(specifier)
  return match?.[1] ?? null
}

function isCompositionPath(path: string): boolean {
  return (
    path.startsWith('start/') ||
    path.startsWith('app/composition/') ||
    /^app\/modules\/[^/]+\/bootstrap\//.test(path) ||
    /^app\/modules\/[^/]+\/infra\/adapters\//.test(path)
  )
}

function scanImportSpecifiers(paths: string[], forbidden: RegExp[]): ImportViolation[] {
  const importPattern =
    "import\\s+(?:type\\s+)?(?:[\\s\\S]*?\\s+from\\s+)?['\\\"]([^'\\\"]+)['\\\"]|export\\s+(?:type\\s+)?[\\s\\S]*?\\s+from\\s+['\\\"]([^'\\\"]+)['\\\"]|import\\(\\s*['\\\"]([^'\\\"]+)['\\\"]\\s*\\)"

  try {
    const output = execFileSync(
      'rg',
      [importPattern, ...paths, '--glob', '*.ts', '--line-number', '--replace', '$path:$line:$1'],
      { encoding: 'utf8' }
    )

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        const [file, lineNumber, specifier] = line.split(':')
        if (!file || !lineNumber || !specifier) return []

        if (!forbidden.some((pattern) => pattern.test(specifier))) return []

        return [
          {
            file,
            line: Number.parseInt(lineNumber, 10),
            specifier,
          },
        ]
      })
  } catch {
    return []
  }
}

function scanBoundaryViolations(): ImportViolation[] {
  const legacyCoreContextSpecifier = ['#modules', 'core', 'types', 'execution_context'].join('/')

  return scanImportSpecifiers(['app', 'start', 'config', 'commands', 'tests'], [
    /^#platform\/dtos(?:\/|$)/,
    /^#types\/database$/,
    new RegExp(`^${legacyCoreContextSpecifier}$`),
    /^#modules\/outbox(?:\/|$)/,
    /^#modules\/[^/]+\/(infra|domain|constants|validators)(?:\/|$)/,
    /^#modules\/[^/]+\/actions\/public_api$/,
    /^#modules\/[^/]+\/(application\/dtos|actions\/dtos|controllers\/mappers)(?:\/|$)/,
  ]).flatMap((violation) => {
    const sourceModule = moduleNameFromPath(violation.file)
    const targetModule = importedModule(violation.specifier)

    if (violation.specifier.startsWith('#modules/outbox')) {
      if (
        violation.file.startsWith('app/modules/outbox/') ||
        violation.file.startsWith('app/composition/') ||
        violation.file.startsWith('start/')
      ) {
        return []
      }

      return [{ ...violation, reason: 'business modules must use local event publisher ports' }]
    }

    if (
      violation.specifier.startsWith('#platform/dtos') ||
      violation.specifier === '#types/database' ||
      violation.specifier === legacyCoreContextSpecifier
    ) {
      return [violation]
    }

    if (!sourceModule || !targetModule || sourceModule === targetModule) return []
    if (isCompositionPath(violation.file)) return []

    if (violation.specifier.endsWith('/actions/public_api')) {
      return violation.file.includes('/actions/') || violation.file.includes('/domain/')
        ? [{ ...violation, reason: 'business code must call local ports, not foreign public_api' }]
        : []
    }

    return [violation]
  })
}

test.group('Architecture boundary guards', () => {
  test('production code does not import from eliminated modules common', ({ assert }) => {
    assert.equal(countRgMatches("from '#modules/common'", ['app']), 0)
  })

  test('protected domain layers do not import cross-module role constants', ({ assert }) => {
    const protectedPaths = [
      'app/modules/authorization',
      'app/modules/tasks/domain',
      'app/modules/projects/domain',
    ]

    for (const pattern of [
      "from '#modules/organizations/constants",
      "from '#modules/projects/constants",
      "from '#modules/users/constants",
    ]) {
      assert.equal(countRgMatches(pattern, protectedPaths), 0)
    }
  })

  test('authorization module does not import user module internals', ({ assert }) => {
    assert.deepEqual(
      scanImportSpecifiers(['app/modules/authorization'], [
        /^#modules\/users\/(?!actions\/public_api$)/,
      ]),
      []
    )
  })

  test('actions and modules do not import Lucid model instances from infra', ({ assert }) => {
    const violations = scanImportSpecifiers(['app/modules'], [
      /^#modules\/[^/]+\/infra\/models\//,
    ]).filter((violation) => /\/(actions|controllers)\//.test(violation.file))

    assert.deepEqual(violations, [])
  })

  test('actions and modules do not import the monolithic task repository facade', ({
    assert,
  }) => {
    assert.equal(
      countRgMatches("from '#modules/tasks/infra/repositories/task_repository'", ['app/modules']),
      0
    )
  })

  test('actions do not import the organization user repository facade', ({ assert }) => {
    assert.equal(
      countRgMatches("from '#modules/organizations/infra/repositories/organization_user_repository'", [
        'app/modules',
      ]),
      0
    )
  })

  test('source code does not import deprecated layer aliases', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app', 'start', 'config', 'commands', 'tests'], [
      /^#actions\//,
      /^#infra\//,
    ]), [])
  })

  test('core module does not import from business or HTTP modules', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules/core'], [
      /^#modules\/(?!core\/)/,
      /^@adonisjs\/core\/http$/,
    ]), [])
  })

  test('actions do not import module bootstrap composition roots', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules'], [
      /^#bootstrap\//,
      /^#modules\/[^/]+\/bootstrap\//,
    ]).filter((violation) => violation.file.includes('/actions/')), [])
  })

  test('business modules do not import HTTP DTO buckets or legacy validation rules', ({ assert }) => {
    assert.deepEqual(scanImportSpecifiers(['app/modules'], [
      /^#modules\/http\/actions\/dtos\//,
      /^#types\/validation_rules$/,
    ]).filter((violation) => !violation.file.includes('/modules/http/')), [])
  })

  test('module boundary violations do not exceed generated baseline', ({ assert }) => {
    const baseline = readBoundaryBaseline()
    const newViolations = scanBoundaryViolations().filter((violation) => {
      return !baseline.has(`${violation.file}:${violation.specifier}`)
    })

    assert.deepEqual(newViolations, [])
  })
})
