import { access, readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { test } from '@japa/runner'

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectTypeScriptFiles(path)
      }

      return entry.isFile() && path.endsWith('.ts') ? [path] : []
    })
  )

  return files.flat()
}

test.group('Unit | Tasks and Users search candidate boundary', () => {
  test('feature production code owns candidate ports without importing Search engine runtime', async ({
    assert,
  }) => {
    const moduleRoots = [
      join(process.cwd(), 'app/modules/tasks'),
      join(process.cwd(), 'app/modules/users'),
    ]
    const violations: string[] = []

    for (const moduleRoot of moduleRoots) {
      const typeScriptFiles = await collectTypeScriptFiles(moduleRoot)
      const files = typeScriptFiles.filter(
        (file) => !relative(moduleRoot, file).startsWith('tests/')
      )

      for (const file of files) {
        const source = await readFile(file, 'utf8')
        if (
          source.includes('#modules/search/public_contracts/search_engine') ||
          source.includes('isSearchRuntimeEnabled') ||
          /search(?:PublicTasks|Tasks|Talents)ViaEngine/.test(source)
        ) {
          violations.push(relative(process.cwd(), file))
        }
      }
    }

    assert.deepEqual(violations, [])
  })

  test('feature actions and bootstrap never resolve outer composition', async ({ assert }) => {
    const directories = [
      join(process.cwd(), 'app/modules/tasks/actions'),
      join(process.cwd(), 'app/modules/tasks/bootstrap'),
      join(process.cwd(), 'app/modules/users/actions'),
      join(process.cwd(), 'app/modules/users/bootstrap'),
    ]
    const violations: string[] = []

    for (const directory of directories) {
      try {
        await access(directory)
      } catch {
        continue
      }
      for (const file of await collectTypeScriptFiles(directory)) {
        const source = await readFile(file, 'utf8')
        if (source.includes('#composition/')) {
          violations.push(relative(process.cwd(), file))
        }
      }
    }

    assert.deepEqual(violations, [])
  })

  test('legacy engine adapters no longer exist inside feature infrastructure', async ({
    assert,
  }) => {
    const legacyFiles = [
      join(
        process.cwd(),
        'app/modules/tasks/infra/adapters/engine_task_search_candidate_readers.ts'
      ),
      join(
        process.cwd(),
        'app/modules/users/infra/adapters/engine_talent_search_candidate_reader.ts'
      ),
    ]

    const existing: string[] = []
    for (const file of legacyFiles) {
      try {
        await access(file)
        existing.push(relative(process.cwd(), file))
      } catch {
        // Absence is the architectural invariant.
      }
    }

    assert.deepEqual(existing, [])
  })
})
