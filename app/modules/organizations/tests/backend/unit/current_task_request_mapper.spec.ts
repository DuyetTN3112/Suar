import { test } from '@japa/runner'

import { buildCurrentOrganizationTasksIndexPageInput } from '#modules/organizations/tasks/controllers/mappers/request/current_task_request_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Current task request mapper', () => {
  test('normalizes current organization task pagination with shared policy', ({ assert }) => {
    const input = buildCurrentOrganizationTasksIndexPageInput(
      fakeRequest({
        page: '0',
        limit: '999',
        status: 'status-1',
        priority: 'high',
      }) as never,
      20
    )

    assert.deepEqual(input, {
      page: 1,
      limit: 100,
      task_status_id: ['status-1'],
      priority: ['high'],
      sort_by: 'due_date',
      sort_order: 'asc',
    })
  })

  test('prefers camelCase query aliases for current organization task filters', ({ assert }) => {
    const input = buildCurrentOrganizationTasksIndexPageInput(
      fakeRequest({
        taskStatusId: 'status-2',
        assignedTo: 'user-1',
        parentTaskId: null,
        projectId: 'project-1',
        sortBy: 'updated_at',
        sortOrder: 'desc',
      }) as never,
      20
    )

    assert.deepEqual(input, {
      page: 1,
      limit: 20,
      task_status_id: ['status-2'],
      assigned_to: ['user-1'],
      parent_task_id: null,
      requested_project_id: 'project-1',
      sort_by: 'updated_at',
      sort_order: 'desc',
    })
  })
})
