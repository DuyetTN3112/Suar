import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import router from '@adonisjs/core/services/router'
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

  test('production HTTP code talks to search through public contracts', async ({ assert }) => {
    const httpRoot = join(process.cwd(), 'app/modules/http')
    const typeScriptFiles = await collectTypeScriptFiles(httpRoot)
    const files = typeScriptFiles.filter((file) => !relative(httpRoot, file).startsWith('tests/'))
    const forbiddenImports = [
      '#modules/search/actions/',
      '#modules/search/bootstrap/',
      '#modules/search/controllers/',
      '#modules/search/domain/',
      '#modules/search/infra/adapters/index-administration/',
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

  test('account deletion is not exposed as an inline placeholder route', async ({ assert }) => {
    const settingsRoutes = await readFile(join(process.cwd(), 'start/routes/settings.ts'), 'utf8')

    assert.notMatch(settingsRoutes, /\.delete\(\s*['"]\/account['"]\s*,\s*\(\{/u)
    assert.notInclude(settingsRoutes, "as('account.destroy')")
  })

  test('operations routes are not nested under a compatibility transport binding', async ({
    assert,
  }) => {
    const apiRoutes = await readFile(join(process.cwd(), 'start/routes/api.ts'), 'utf8')
    assert.include(apiRoutes, "bindHttpTransport('api-ops-internal')")
    assert.include(apiRoutes, "bindHttpTransport('api-compat')")
  })

  test('Redis controllers execute cache operations through application actions', async ({
    assert,
  }) => {
    const controller = await readFile(
      join(process.cwd(), 'app/modules/http/controllers/cache/redis_list_keys_controller.ts'),
      'utf8'
    )

    assert.notInclude(controller, '#modules/cache/public_contracts/cache_store')
    assert.include(controller, 'makeListCacheKeysQuery')
  })

  test('application controllers use the Result boundary instead of direct execute calls', async ({
    assert,
  }) => {
    const modulesRoot = join(process.cwd(), 'app/modules')
    const typeScriptFiles = await collectTypeScriptFiles(modulesRoot)
    const allowedOperationalControllers = new Set([
      'http/controllers/runtime/dev_controller.ts',
      'http/controllers/runtime/health_checks_controller.ts',
    ])
    const violations: string[] = []

    for (const file of typeScriptFiles) {
      const relativePath = relative(modulesRoot, file)
      if (
        !relativePath.includes('/controllers/') ||
        !relativePath.endsWith('_controller.ts') ||
        relativePath.includes('/tests/') ||
        allowedOperationalControllers.has(relativePath)
      ) {
        continue
      }

      const source = await readFile(file, 'utf8')
      if (/\.execute\s*\(/u.test(source)) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('every operational/API route has exactly one explicit transport binding', ({ assert }) => {
    const violations: string[] = []

    for (const routes of Object.values(router.toJSON())) {
      for (const route of routes) {
        const transportBindings = [...route.middleware.all()].filter(
          (entry) => entry.name === 'bindHttpTransport'
        )
        const requiresExplicitBinding =
          route.pattern.startsWith('/api') ||
          route.pattern === '/live' ||
          route.pattern === '/health' ||
          route.pattern.startsWith('/metrics/')

        if (
          transportBindings.length > 1 ||
          (requiresExplicitBinding && transportBindings.length !== 1)
        ) {
          violations.push(
            `${route.methods.join(',')} ${route.pattern}: ${transportBindings.length}`
          )
        }
      }
    }

    assert.deepEqual(violations, [])
  })

  test('production controllers stay below the controller outlier threshold', async ({ assert }) => {
    const modulesRoot = join(process.cwd(), 'app/modules')
    const typeScriptFiles = await collectTypeScriptFiles(modulesRoot)
    const files = typeScriptFiles.filter((file) => {
      const relativePath = relative(modulesRoot, file)
      return (
        relativePath.includes('/controllers/') &&
        relativePath.endsWith('_controller.ts') &&
        !relativePath.includes('/tests/') &&
        !relativePath.startsWith('testing/')
      )
    })
    const outliers: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const lineCount = source.split(/\r?\n/u).length
      if (lineCount > 200) {
        outliers.push(`${relative(process.cwd(), file)}: ${lineCount}`)
      }
    }

    assert.deepEqual(outliers, [])
  })
})
