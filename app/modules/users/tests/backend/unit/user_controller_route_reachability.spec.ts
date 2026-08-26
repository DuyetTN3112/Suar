import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

async function collectControllers(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name)
      if (entry.isDirectory()) return collectControllers(absolutePath)
      return entry.isFile() && entry.name.endsWith('_controller.ts') ? [absolutePath] : []
    })
  )
  return files.flat()
}

test('Unit | Every concrete Users controller is reachable from a route', async ({ assert }) => {
  const controllersDirectory = join(process.cwd(), 'app/modules/users/controllers')
  const controllers = await collectControllers(controllersDirectory)
  const routeDirectoryEntries = await readdir(join(process.cwd(), 'start/routes'))
  const routeFiles = await Promise.all(
    routeDirectoryEntries
      .filter((file) => file.endsWith('.ts'))
      .map((file) => readFile(join(process.cwd(), 'start/routes', file), 'utf8'))
  )
  const routeSource = routeFiles.join('\n')
  const orphans = [] as string[]
  for (const absolutePath of controllers) {
    const source = await readFile(absolutePath, 'utf8')
    if (/^export \{ default \} from /m.test(source) && /^export \* from /m.test(source)) continue

    const relativePath = absolutePath.slice(controllersDirectory.length + 1, -3)
    const modulePath = `#modules/users/controllers/${relativePath}`
    if (!routeSource.includes(modulePath)) orphans.push(relativePath)
  }

  assert.deepEqual(orphans, [])
})
