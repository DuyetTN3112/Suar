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

test.group('Integration | Organization architecture', () => {
  test('production organization code talks to tasks through public contracts', async ({
    assert,
  }) => {
    const organizationRoot = join(process.cwd(), 'app/modules/organizations')
    const typeScriptFiles = await collectTypeScriptFiles(organizationRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(organizationRoot, file).startsWith('tests/')
    )
    const forbiddenImports = [
      '#modules/tasks/actions/',
      '#modules/tasks/bootstrap/',
      '#modules/tasks/controllers/',
      '#modules/tasks/domain/',
      '#modules/tasks/infra/',
      '#modules/tasks/validators/',
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
