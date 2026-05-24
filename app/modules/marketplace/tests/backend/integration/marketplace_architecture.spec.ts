import { readdir, readFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

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


test.group('', () => {
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

  test('project access is wired by an outer adapter instead of a provider facade', async ({
    assert,
  }) => {
    const adapterPath = join(
      process.cwd(),
      'app/composition/adapters/marketplace/marketplace_project_access_adapter.ts'
    )
    const source = await readFile(adapterPath, 'utf8')

    assert.include(source, '#modules/marketplace/actions/ports/outbound/project_access_port')
    assert.include(
      source,
      '#modules/projects/actions/queries/marketplace/get_marketplace_project_access_query'
    )
    assert.notInclude(source, 'projectPublicApi')
    assert.notInclude(source, '@adonisjs/lucid/services/db')
    assert.notInclude(source, "from('projects")
    assert.notInclude(source, "from('project_members")
    assert.notInclude(source, "from('organization_users")
  })

  test('marketplace adapters do not own database queries for other bounded contexts', async ({
    assert,
  }) => {
    const marketplaceRoot = join(process.cwd(), 'app/modules/marketplace')
    const marketplaceFiles = await collectTypeScriptFiles(marketplaceRoot)
    const files = marketplaceFiles.filter(
      (file) => !relative(marketplaceRoot, file).startsWith('tests/')
    )
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
      'app/modules/marketplace/actions/queries/marketplace-application/get_marketplace_tasks_query.ts',
      'app/modules/marketplace/controllers/mappers/request/marketplace-tasks/marketplace_task_request_mapper.ts',
    ].map((file) => join(process.cwd(), file))
    const forbiddenImports = [
      '#modules/tasks/bootstrap/',
      '#modules/tasks/actions/dtos/request/task_application_dtos',
      '#modules/tasks/controllers/mappers/request/task-applications/task_application_request_mapper',
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
    const mappersRoot = join(process.cwd(), 'app/modules/marketplace/controllers/mappers/request')
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

  test('marketplace application request mapping owns its DTO and validation vocabulary', async ({
    assert,
  }) => {
    const mapperPath = join(
      process.cwd(),
      'app/modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_application_request_mapper.ts'
    )
    const source = await readFile(mapperPath, 'utf8')

    assert.notInclude(source, '#modules/tasks/')
  })

  test('marketplace response mappers do not re-export task controller mappers', async ({
    assert,
  }) => {
    const mappersRoot = join(process.cwd(), 'app/modules/marketplace/controllers/mappers/response')
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

  test('marketplace application response mapping owns its status vocabulary', async ({
    assert,
  }) => {
    const mapperPath = join(
      process.cwd(),
      'app/modules/marketplace/controllers/mappers/response/marketplace-application/marketplace_application_response_mapper.ts'
    )
    const source = await readFile(mapperPath, 'utf8')

    assert.notInclude(source, '#modules/tasks/')
  })

  test('marketplace application actions depend on their consumer-owned port only', async ({
    assert,
  }) => {
    const files = [
      'app/modules/marketplace/actions/commands/marketplace-application/apply_marketplace_task_command.ts',
      'app/modules/marketplace/actions/commands/marketplace-application/process_marketplace_application_command.ts',
      'app/modules/marketplace/actions/commands/marketplace-application/withdraw_marketplace_application_command.ts',
      'app/modules/marketplace/actions/queries/marketplace-application/get_marketplace_application_match_score_query.ts',
      'app/modules/marketplace/actions/queries/marketplace-application/get_marketplace_task_applications_query.ts',
      'app/modules/marketplace/actions/queries/marketplace-application/get_marketplace_task_applications_ranking_query.ts',
      'app/modules/marketplace/actions/queries/marketplace-application/get_my_marketplace_applications_query.ts',
    ].map((file) => join(process.cwd(), file))
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (
        source.includes('#modules/tasks/') ||
        !source.includes(
          '#modules/marketplace/actions/ports/outbound/marketplace-application/task_application_flow_port'
        )
      ) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('marketplace controllers receive local action factories through dependency injection', async ({
    assert,
  }) => {
    const controllersRoot = join(process.cwd(), 'app/modules/marketplace/controllers')
    const controllerFiles = await collectTypeScriptFiles(controllersRoot)
    const files = controllerFiles.filter((file) => {
      const name = basename(file)
      return name.endsWith('_controller.ts') && name !== 'marketplace_controller.ts'
    })
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (
        source.includes('#composition/') ||
        source.includes('marketplaceCompositionRoot') ||
        source.includes('#modules/marketplace/actions/services/') ||
        !source.includes('#modules/marketplace/actions/ports/inbound/marketplace_action_factory') ||
        !source.includes('MarketplaceActionFactory')
      ) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('marketplace does not own task application persistence', async ({ assert }) => {
    const marketplaceRoot = join(process.cwd(), 'app/modules/marketplace')
    const marketplaceFiles = await collectTypeScriptFiles(marketplaceRoot)
    const files = marketplaceFiles.filter(
      (file) => !relative(marketplaceRoot, file).startsWith('tests/')
    )
    const violations: string[] = []

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      if (
        source.includes("from('task_applications") ||
        source.includes("table('task_applications") ||
        source.includes("join('task_applications")
      ) {
        violations.push(relative(process.cwd(), file))
      }
    }

    assert.deepEqual(violations, [])
  })

  test('production marketplace code talks to tasks through consumer-owned ports', async ({
    assert,
  }) => {
    const marketplaceRoot = join(process.cwd(), 'app/modules/marketplace')
    const typeScriptFiles = await collectTypeScriptFiles(marketplaceRoot)
    const files = typeScriptFiles.filter(
      (file) => !relative(marketplaceRoot, file).startsWith('tests/')
    )
    const forbiddenImports = ['#modules/tasks/']
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
