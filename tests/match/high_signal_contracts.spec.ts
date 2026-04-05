import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

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

test.group('Match | High-signal contracts', () => {
  test('task list filter keeps canonical task_status_id with legacy alias support', ({
    assert,
  }) => {
    const controllerContent = readFile('app/controllers/tasks/list_tasks_controller.ts')
    const filterHookContent = readFile('inertia/pages/tasks/hooks/use_task_filters.svelte.ts')
    const typesContent = readFile('inertia/pages/tasks/types.svelte.ts')

    assert.match(controllerContent, /request\.input\('task_status_id'\)/)
    assert.match(controllerContent, /request\.input\('status'\)/)
    assert.match(controllerContent, /task_status_id:\s*dto\.task_status_id/)
    assert.match(filterHookContent, /task_status_id/)
    assert.match(typesContent, /task_status_id/)
  })

  test('controllers stay adapter-only, domain stays pure, and organization billing stays removed', ({
    assert,
  }) => {
    const controllerFiles = listFiles('app/controllers').filter(
      (file) => file.endsWith('.ts') && !file.startsWith('app/controllers/http/')
    )
    const domainFiles = listFiles('app/domain').filter((file) => file.endsWith('.ts'))

    for (const file of controllerFiles) {
      const content = readFile(file)
      assert.notMatch(content, /from ['"]#infra\//)
      assert.notMatch(content, /from ['"]#models\//)
    }

    for (const file of domainFiles) {
      const content = readFile(file)
      assert.notMatch(content, /from ['"]#infra\//)
      assert.notMatch(content, /from ['"]#models\//)
      assert.notMatch(content, /from ['"]@adonisjs\//)
      assert.notMatch(content, /from ['"]mongoose['"]/)
    }

    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/organization/billing')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/actions/organization/billing')))
    assert.isFalse(
      fs.existsSync(path.join(WORKSPACE_ROOT, 'inertia/pages/org/billing/index.svelte'))
    )

    const organizationRoutes = readFile('start/routes/organization.ts')
    assert.notMatch(organizationRoutes, /\/billing\b/)
  })

  test('task and marketplace UI guardrails stay aligned with permission and layout rules', ({
    assert,
  }) => {
    const tasksIndexContent = readFile('inertia/pages/tasks/index.svelte')
    const applyModalContent = readFile(
      'inertia/pages/marketplace/components/apply_task_modal.svelte'
    )
    const appSidebarContent = readFile('inertia/components/layout/app_sidebar.svelte')

    assert.match(tasksIndexContent, /Bạn không đủ quyền tạo nhiệm vụ/)
    assert.match(tasksIndexContent, /canCreateTask=\{createTaskPermission\.allowed\}/)
    assert.notMatch(appSidebarContent, /Quản Trị Tổ Chức/)
    assert.notMatch(appSidebarContent, /\/org\/tasks/)
    assert.notMatch(applyModalContent, /Mức giá đề xuất/)
    assert.notMatch(applyModalContent, /expected_rate/)
  })
})
