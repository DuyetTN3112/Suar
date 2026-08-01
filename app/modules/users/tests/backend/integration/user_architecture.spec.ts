import { readdir, readFile } from 'node:fs/promises'
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

test.group('Integration | User architecture', () => {
  test('production user code talks to organizations through public contracts', async ({
    assert,
  }) => {
    const userRoot = join(process.cwd(), 'app/modules/users')
    const typeScriptFiles = await collectTypeScriptFiles(userRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(userRoot, file).startsWith('tests/')
    )
    const forbiddenImports = [
      '#modules/organizations/directory/actions/',
      '#modules/organizations/bootstrap/',
      '#modules/organizations/directory/controllers/',
      '#modules/organizations/directory/domain/',
      '#modules/organizations/directory/infra/',
      '#modules/organizations/directory/validators/',
    ]
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (forbiddenImports.some((importPath) => source.includes(importPath))) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })
})
