import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface ImportReference {
  file: string
  kind: string
  line: number
  resolution: 'alias' | 'relative' | null
  sourceModule: string | null
  specifier: string
  targetLayer: string | null
  targetModule: string | null
  targetTail: string | null
}

export const IMPORT_SCANNER = 'scripts/architecture/import_scanner.mjs'
export const ARCHITECTURE_TEST_LOCK = join(tmpdir(), 'suar-architecture-boundary-guards.lock')
export const ARCHITECTURE_TEST_LOCK_OWNER = join(ARCHITECTURE_TEST_LOCK, 'owner')

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function acquireArchitectureTestLock(): Promise<void> {
  for (;;) {
    try {
      mkdirSync(ARCHITECTURE_TEST_LOCK)
      writeFileSync(ARCHITECTURE_TEST_LOCK_OWNER, String(process.pid))
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error

      let ownerPid: number | null = null
      try {
        ownerPid = Number.parseInt(readFileSync(ARCHITECTURE_TEST_LOCK_OWNER, 'utf8'), 10)
      } catch {
        // The owner may be between mkdir and writing its PID; wait for the next attempt.
      }

      if (ownerPid !== null && Number.isInteger(ownerPid) && !isProcessAlive(ownerPid)) {
        rmSync(ARCHITECTURE_TEST_LOCK, { force: true, recursive: true })
        continue
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

export function releaseArchitectureTestLock(): void {
  rmSync(ARCHITECTURE_TEST_LOCK, { force: true, recursive: true })
}

export function scanImportSpecifiers(
  paths: string[],
  forbidden: RegExp[],
  { excludeTests = false }: { excludeTests?: boolean } = {}
): ImportReference[] {
  const output = execFileSync(
    'node',
    [IMPORT_SCANNER, '--json', ...(excludeTests ? ['--exclude-tests'] : []), ...paths],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  const references = JSON.parse(output) as ImportReference[]

  return references.filter((reference) =>
    forbidden.some((pattern) => pattern.test(reference.specifier))
  )
}

export function scanProductionImportSpecifiers(
  paths: string[],
  forbidden: RegExp[]
): ImportReference[] {
  return scanImportSpecifiers(paths, forbidden, { excludeTests: true })
}

export function runArchitectureGuard(script: string): void {
  execFileSync('node', [script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
