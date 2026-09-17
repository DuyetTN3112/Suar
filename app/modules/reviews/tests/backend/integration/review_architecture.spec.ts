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

test.group('Integration | Review architecture', () => {
  test('production review code talks to other modules through public contracts', async ({
    assert,
  }) => {
    const reviewRoot = join(process.cwd(), 'app/modules/reviews')
    const typeScriptFiles = await collectTypeScriptFiles(reviewRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(reviewRoot, file).startsWith('tests/')
    )
    const externalModules = ['organizations', 'projects', 'tasks', 'users']
    const forbiddenLayers = ['actions', 'bootstrap', 'controllers', 'domain', 'infra', 'validators']
    const forbiddenImports = externalModules.flatMap((moduleName) =>
      forbiddenLayers.map((layer) => `#modules/${moduleName}/${layer}/`)
    )
    const violations: string[] = []

    const baselinePath = join(
      process.cwd(),
      'docs/architecture/generated/module_boundary_runtime_baseline.json'
    )
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as Array<{
      file: string
      import_path: string
    }>
    const baselineFiles = new Set(baseline.map((entry) => entry.file))

    for (const file of files) {
      const relPath = relative(process.cwd(), file)
      if (baselineFiles.has(relPath)) continue

      const source = await readFile(file, 'utf8')
      if (forbiddenImports.some((importPath) => source.includes(importPath))) {
        violations.push(relPath)
      }
    }

    assert.deepEqual(violations, [])
  })
})
