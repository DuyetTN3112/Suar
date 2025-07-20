import { test } from '@japa/runner'

import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import {
  buildTaskUpdateNotificationRequests,
  sendTaskUpdateNotifications,
} from '#actions/tasks/support/update_task_post_commit_support'
import { BACKEND_NOTIFICATION_TYPES } from '#constants/notification_constants'
import type Task from '#models/task'
import type User from '#models/user'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

function makeTask(overrides: Record<string, unknown> = {}): Pick<Task, 'id' | 'title' | 'assigned_to'> {
  return {
    id: VALID_UUID,
    title: 'Refactor task pipeline',
    assigned_to: VALID_UUID_2,
    ...overrides,
  }
}

function makeUserRecord(): User {
  const user = {
    username: 'Updater',
    email: 'updater@example.com',
  }

  // @ts-expect-error - notifier only reads username/email in this unit test
  return user
}

test.group('Update task post-commit support', () => {
  test('buildTaskUpdateNotificationRequests plans assignee notifications without extra noise', ({
    assert,
  }) => {
    const requests = buildTaskUpdateNotificationRequests({
      task: makeTask({ assigned_to: VALID_UUID_3 }),
      updaterId: VALID_UUID,
      updaterName: 'Updater',
      dto: UpdateTaskDTO.fromPartialUpdate({ assigned_to: VALID_UUID_3 }),
      oldAssignedTo: VALID_UUID_2,
    })

    assert.deepEqual(requests, [
      {
        user_id: VALID_UUID_3,
        title: 'Bạn có nhiệm vụ mới',
        message: 'Updater đã giao cho bạn nhiệm vụ: Refactor task pipeline',
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        related_entity_type: 'task',
        related_entity_id: VALID_UUID,
      },
    ])
  })

  test('buildTaskUpdateNotificationRequests plans the old-assignee unassign message', ({
    assert,
  }) => {
    const requests = buildTaskUpdateNotificationRequests({
      task: makeTask({ assigned_to: null }),
      updaterId: VALID_UUID,
      updaterName: 'Updater',
      dto: UpdateTaskDTO.fromPartialUpdate({ assigned_to: null }),
      oldAssignedTo: VALID_UUID_2,
    })

    assert.deepEqual(requests, [
      {
        user_id: VALID_UUID_2,
        title: 'Cập nhật nhiệm vụ',
        message: 'Updater đã bỏ giao nhiệm vụ: Refactor task pipeline',
        type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
        related_entity_type: 'task',
        related_entity_id: VALID_UUID,
      },
    ])
  })

  test('sendTaskUpdateNotifications resolves updater metadata and dispatches planned notifications', async ({
    assert,
  }) => {
    const notifications: {
      user_id: string
      title: string
      message: string
      type: string
      related_entity_type?: string
      related_entity_id?: string
    }[] = []
    await sendTaskUpdateNotifications(
      {
        task: makeTask({ assigned_to: VALID_UUID_3 }),
        updaterId: VALID_UUID,
        dto: UpdateTaskDTO.fromPartialUpdate({ assigned_to: VALID_UUID_3 }),
        oldAssignedTo: VALID_UUID_2,
        createNotification: {
          handle: (payload) => {
            notifications.push(payload)
            return Promise.resolve(null)
          },
        },
      },
      {
        findUserIdentity: () => Promise.resolve(makeUserRecord()),
      }
    )

    assert.lengthOf(notifications, 1)
    const [
      notification = {
        user_id: '',
        title: '',
        message: '',
        type: '',
        related_entity_type: '',
        related_entity_id: '',
      },
    ] = notifications
    assert.equal(notification.user_id, VALID_UUID_3)
    assert.equal(notification.type, BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED)
    assert.equal(notification.related_entity_type, 'task')
    assert.equal(notification.related_entity_id, VALID_UUID)
  })
})
