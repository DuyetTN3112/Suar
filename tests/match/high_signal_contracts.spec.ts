import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
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
})
