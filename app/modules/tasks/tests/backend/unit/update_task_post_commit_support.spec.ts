import { test } from '@japa/runner'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { buildTaskUpdateNotificationRequests } from '#modules/tasks/actions/commands/internal/update_task_post_commit'
import type Task from '#modules/tasks/infra/models/task'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

function makeTask(
  overrides: Record<string, unknown> = {}
): Pick<Task, 'id' | 'title' | 'organization_id' | 'assigned_to'> {
  return {
    id: VALID_UUID,
    title: 'Refactor task pipeline',
    organization_id: VALID_UUID,
    assigned_to: VALID_UUID_2,
    ...overrides,
  }
}

test.group('Update task post-commit support', () => {
  test('buildTaskUpdateNotificationRequests plans assignee notifications without extra noise', ({
    assert,
  }) => {
    const requests = buildTaskUpdateNotificationRequests({
      task: makeTask({ assigned_to: VALID_UUID_3 }),
      updaterId: VALID_UUID,
      hasAssigneeChange: true,
      isUnassigning: false,
      oldAssignedTo: VALID_UUID_2,
    })

    assert.deepEqual(requests, [
      {
        recipientId: VALID_UUID_3,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        eventName: 'task.updated_assigned',
        assignmentChange: 'assigned',
      },
    ])
  })

  test('buildTaskUpdateNotificationRequests plans the old-assignee unassign message', ({
    assert,
  }) => {
    const requests = buildTaskUpdateNotificationRequests({
      task: makeTask({ assigned_to: null }),
      updaterId: VALID_UUID,
      hasAssigneeChange: true,
      isUnassigning: true,
      oldAssignedTo: VALID_UUID_2,
    })

    assert.deepEqual(requests, [
      {
        recipientId: VALID_UUID_2,
        type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
        eventName: 'task.updated_unassigned',
        assignmentChange: 'unassigned',
      },
    ])
  })
})
