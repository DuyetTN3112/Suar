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

test.group('Integration | Marketplace architecture', () => {
  test('production marketplace code depends on tasks public contracts instead of tasks infra', async ({
    assert,
  }) => {
    const marketplaceRoot = join(process.cwd(), 'app/modules/marketplace')
    const typeScriptFiles = await collectTypeScriptFiles(marketplaceRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(marketplaceRoot, file).startsWith('tests/')
    )
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (source.includes('#modules/tasks/infra/')) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('project access adapter delegates to projects public API instead of querying tables', async ({
    assert,
  }) => {
    const adapterPath = join(
      process.cwd(),
      'app/modules/marketplace/infra/adapters/projects_public_api_project_access.ts'
    )
    const source = await readFile(adapterPath, 'utf8')

    assert.include(source, '#modules/projects/public_contracts/project_public_api')
    assert.notInclude(source, '@adonisjs/lucid/services/db')
    assert.notInclude(source, "from('projects")
    assert.notInclude(source, "from('project_members")
    assert.notInclude(source, "from('organization_users")
  })

  test('marketplace adapters do not own database queries for other bounded contexts', async ({
    assert,
  }) => {
    const adaptersRoot = join(process.cwd(), 'app/modules/marketplace/infra/adapters')
    const files = await collectTypeScriptFiles(adaptersRoot)
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (source.includes('@adonisjs/lucid/services/db')) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('marketplace task listing depends on tasks public contract only', async ({ assert }) => {
    const files = [
      'app/modules/marketplace/actions/queries/get_marketplace_tasks_query.ts',
      'app/modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper.ts',
    ].map((file) => join(process.cwd(), file))
    const forbiddenImports = [
      '#modules/tasks/bootstrap/',
      '#modules/tasks/actions/dtos/request/task_application_dtos',
      '#modules/tasks/controllers/mappers/request/task_application_request_mapper',
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

  test('marketplace request mappers do not re-export task controller mappers', async ({
    assert,
  }) => {
    const mappersRoot = join(
      process.cwd(),
      'app/modules/marketplace/controllers/mappers/request'
    )
    const files = await collectTypeScriptFiles(mappersRoot)
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (source.includes('#modules/tasks/controllers/mappers/request/')) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('marketplace response mappers do not re-export task controller mappers', async ({
    assert,
  }) => {
    const mappersRoot = join(
      process.cwd(),
      'app/modules/marketplace/controllers/mappers/response'
    )
    const files = await collectTypeScriptFiles(mappersRoot)
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (source.includes('#modules/tasks/controllers/mappers/response/')) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('production marketplace code talks to tasks through public contracts', async ({
    assert,
  }) => {
    const marketplaceRoot = join(process.cwd(), 'app/modules/marketplace')
    const typeScriptFiles = await collectTypeScriptFiles(marketplaceRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(marketplaceRoot, file).startsWith('tests/')
    )
    const forbiddenImports = [
      '#modules/tasks/actions/',
      '#modules/tasks/bootstrap/',
      '#modules/tasks/controllers/',
      '#modules/tasks/domain/',
      '#modules/tasks/infra/',
      '#modules/tasks/types/',
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
