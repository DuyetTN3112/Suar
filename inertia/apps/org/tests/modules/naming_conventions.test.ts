import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = 'inertia/apps/org'
const FRONTEND_NAMING_EXCEPTION_DOC = 'docs/08-testing/frontend-naming-exceptions.md'
// Framework route basenames are allowed only when the parent path names the page domain.
const ROUTE_BASENAME_ALLOWLIST = new Set(['index.svelte', 'show.svelte', 'create.svelte', 'edit.svelte'])
const DOCUMENTED_COMPONENT_INTERFACE_NAMES = [
  // Local component/page props interfaces are allowed when scoped to one Svelte file.
  'Props',
  'PageProps',
]
const DOCUMENTED_APP_SHELL_EXPORTS = [
  // App-shell exports intentionally repeat across admin/org/user shells.
  'FRONTEND_ROUTES',
  'useTranslation',
  'buildOffsetPagination',
  'FilterConfig',
  'FilterValue',
]

const DISALLOWED_LOCAL_PATTERNS = [
  { name: 'const vm', pattern: /\bconst\s+vm\b/g },
  { name: 'const vals', pattern: /\bconst\s+vals\b/g },
  { name: 'const ps', pattern: /\bconst\s+ps\b/g },
  { name: 'function sync', pattern: /\bfunction\s+sync\b/g },
  { name: 'export interface User', pattern: /\bexport\s+interface\s+User\b/g },
  { name: 'export interface Task', pattern: /\bexport\s+interface\s+Task\b/g },
]

interface SourceFile {
  path: string
  content: string
}

interface NamingViolation {
  file: string
  line: number
  name: string
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

function isProductionSource(filePath: string): boolean {
  return (
    (filePath.endsWith('.ts') || filePath.endsWith('.svelte')) &&
    !filePath.includes('/tests/') &&
    !filePath.includes('/shared/generated/')
  )
}

function readProductionSources(root: string): SourceFile[] {
  return walkFiles(root)
    .filter(isProductionSource)
    .map((filePath) => ({
      path: filePath,
      content: readFileSync(filePath, 'utf8'),
    }))
}

function lineNumberForIndex(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

function findPatternViolations(files: SourceFile[]): NamingViolation[] {
  return files.flatMap((file) =>
    DISALLOWED_LOCAL_PATTERNS.flatMap((pattern) =>
      [...file.content.matchAll(pattern.pattern)].map((match) => ({
        file: file.path,
        line: lineNumberForIndex(file.content, match.index),
        name: pattern.name,
      }))
    )
  )
}

function findPascalCaseSvelteBasenames(files: SourceFile[]): NamingViolation[] {
  return files
    .filter((file) => file.path.endsWith('.svelte'))
    .filter((file) => {
      const basename = path.basename(file.path)
      return /^[A-Z]/.test(basename) && !ROUTE_BASENAME_ALLOWLIST.has(basename)
    })
    .map((file) => ({
      file: file.path,
      line: 1,
      name: path.basename(file.path),
    }))
}

function findUndocumentedExceptionTerms(): NamingViolation[] {
  const documentation = readFileSync(FRONTEND_NAMING_EXCEPTION_DOC, 'utf8')
  const documentedTerms = [
    ...ROUTE_BASENAME_ALLOWLIST,
    ...DOCUMENTED_COMPONENT_INTERFACE_NAMES,
    ...DOCUMENTED_APP_SHELL_EXPORTS,
  ]

  return documentedTerms
    .filter((term) => !documentation.includes(term))
    .map((term) => ({
      file: FRONTEND_NAMING_EXCEPTION_DOC,
      line: 1,
      name: term,
    }))
}

describe('Organization frontend naming conventions', () => {
  it('uses searchable intention-revealing names in production sources', () => {
    const files = readProductionSources(APP_ROOT)

    expect([
      ...findPatternViolations(files),
      ...findPascalCaseSvelteBasenames(files),
      ...findUndocumentedExceptionTerms(),
    ]).toEqual([])
  })
})
