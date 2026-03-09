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

test.group('Unit | Pagination Architecture', () => {
  test('other backend modules depend on pagination public api only', async ({ assert }) => {
    const modulesRoot = join(process.cwd(), 'app/modules')
    const typeScriptFiles = await collectTypeScriptFiles(modulesRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(modulesRoot, file).startsWith('pagination/')
    )
    const internalImportPattern =
      /#modules\/pagination\/public_contracts\/(?!pagination_public_api(?:['"]))/g
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (internalImportPattern.test(source)) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })
})
