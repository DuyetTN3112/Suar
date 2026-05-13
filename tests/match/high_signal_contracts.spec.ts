import fs from 'node:fs'
import path from 'node:path'

import { test } from '@japa/runner'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

function listFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(WORKSPACE_ROOT, relativeDir)
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = path.posix.join(relativeDir, entry.name)

    if (entry.isDirectory()) {
      return listFiles(relativePath)
    }

    return [relativePath]
  })
}

function assertFilesDoNotMatch(
  assert: { notMatch: (value: string, pattern: RegExp) => void },
  files: string[],
  pattern: RegExp
) {
  for (const file of files) {
    assert.notMatch(readFile(file), pattern)
  }
}

function assertPathsExist(assert: { isTrue: (value: boolean) => void }, paths: string[]) {
  for (const relativePath of paths) {
    assert.isTrue(fs.existsSync(path.join(WORKSPACE_ROOT, relativePath)))
  }
}

test.group('Match | High-signal contracts', () => {
  test('non-mapper controllers do not build DTOs or serialize models directly', ({ assert }) => {
    const controllerFiles = listFiles('app/controllers')
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => !file.startsWith('app/controllers/http/'))
      .filter((file) => !file.includes('/mappers/'))

    for (const file of controllerFiles) {
      const content = readFile(file)
      assert.notMatch(content, /\.serialize\(/)
      assert.notMatch(content, /new [A-Za-z0-9_]+DTO\(/)
    }
  })

  test('controllers stay adapter-only, domain stays pure, and organization billing stays removed', ({
    assert,
  }) => {
    const controllerFiles = listFiles('app/controllers').filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.startsWith('app/controllers/http/') &&
        !file.includes('/mappers/')
    )
    const domainFiles = listFiles('app/domain').filter((file) => file.endsWith('.ts'))

    for (const file of controllerFiles) {
      const content = readFile(file)
      if (file === 'app/controllers/auth/social_auth_controller.ts') {
        assert.notMatch(content, /from ['"]#infra\/(?!logger\/auth_logger)/)
      } else {
        assert.notMatch(content, /from ['"]#infra\//)
      }
      assert.notMatch(content, /from ['"]#models\//)
    }

    for (const file of domainFiles) {
      const content = readFile(file)
      assert.notMatch(content, /from ['"]#infra\//)
      assert.notMatch(content, /from ['"]#models\//)
      assert.notMatch(content, /from ['"]@adonisjs\//)
      assert.notMatch(content, /from ['"]mongoose['"]/)
    }

    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/actions/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/infra/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'start/routes/organization.ts')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/organization/billing')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/actions/organization/billing')))
    assert.isFalse(
      fs.existsSync(path.join(WORKSPACE_ROOT, 'inertia/pages/org/billing/index.svelte'))
    )

    const organizationRoutes = readFile('start/routes/organizations_current.ts')
    assert.notMatch(organizationRoutes, /\/billing\b/)
  })

  test('controllers outside mapper directories do not construct DTOs or serialize models inline', ({
    assert,
  }) => {
    const controllerFiles = listFiles('app/controllers').filter(
      (file) => file.endsWith('.ts') && !file.includes('/mappers/')
    )

    for (const file of controllerFiles) {
      const content = readFile(file)
      assert.notMatch(content, /new [A-Za-z0-9_]+DTO\(/)
      assert.notMatch(content, /\.serialize\(/)
    }

    assert.isTrue(
      fs.existsSync(
        path.join(WORKSPACE_ROOT, 'app/controllers/auth/mappers/request/auth_request_mapper.ts')
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/settings/mappers/request/settings_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/organizations/mappers/request/organization_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/organizations/mappers/response/organization_response_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/tasks/mappers/request/task_status_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/tasks/mappers/response/task_status_response_mapper.ts'
        )
      )
    )
  })

  test('task and marketplace UI guardrails stay aligned with permission and layout rules', ({
    assert,
  }) => {
    const tasksIndexContent = readFile('inertia/pages/tasks/index.svelte')
    const applyModalContent = readFile(
      'inertia/pages/marketplace/components/apply_task_modal.svelte'
    )
    const appSidebarContent = readFile('inertia/components/layout/app_sidebar.svelte')

    assert.match(tasksIndexContent, /createTaskPermission=\{vm\.createTaskPermission\}/)
    assert.match(tasksIndexContent, /canCreateTask=\{vm\.createTaskPermission\.allowed\}/)
    assert.notMatch(appSidebarContent, /Quản Trị Tổ Chức/)
    assert.notMatch(appSidebarContent, /\/org\/tasks/)
    assert.notMatch(applyModalContent, /Mức giá đề xuất/)
    assert.notMatch(applyModalContent, /expected_rate/)
  })

  test('task version snapshots stay owned by commands and task:updated stays cache-only', ({
    assert,
  }) => {
    const updateTaskCommandContent = readFile('app/actions/tasks/commands/update_task_command.ts')
    const updateTaskPersistenceSupportContent = readFile(
      'app/actions/tasks/support/update_task_persistence_support.ts'
    )
    const cacheInvalidationContent = readFile('app/listeners/cache_invalidation_listener.ts')

    assert.match(updateTaskCommandContent, /persistTaskUpdateWithinTransaction/)
    assert.match(updateTaskPersistenceSupportContent, /createTaskVersionIfNeeded\(/)
    assert.match(cacheInvalidationContent, /emitter\.on\('task:updated'/)
  })
})
