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

test.group('Integration | HTTP architecture', () => {
  test('only HTTP transport adapters import the HTTP execution-context boundary', async ({
    assert,
  }) => {
    const modulesRoot = join(process.cwd(), 'app/modules')
    const typeScriptFiles = await collectTypeScriptFiles(modulesRoot)
    const files = typeScriptFiles.filter((file) => {
      const relativePath = relative(modulesRoot, file)
      if (relativePath.includes('/tests/')) return false
      return relativePath !== 'http/boundary/http_execution_context.ts'
    })
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const relativePath = relative(modulesRoot, file)
      const isHttpTransportAdapter =
        relativePath.includes('/controllers/') || relativePath.includes('/middleware/')
      if (
        source.includes('#modules/http/boundary/http_execution_context') &&
        !isHttpTransportAdapter
      ) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('production HTTP code talks to search through public contracts', async ({
    assert,
  }) => {
    const httpRoot = join(process.cwd(), 'app/modules/http')
    const typeScriptFiles = await collectTypeScriptFiles(httpRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(httpRoot, file).startsWith('tests/')
    )
    const forbiddenImports = [
      '#modules/search/actions/',
      '#modules/search/bootstrap/',
      '#modules/search/controllers/',
      '#modules/search/domain/',
      '#modules/search/infra/',
      '#modules/search/validators/',
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
