import { test } from '@japa/runner'

import { GetPublicTasksDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import {
  mapPublicTaskCollectionResponse,
  mapPublicTasksApiBody,
  mapPublicTasksPageProps,
} from '#controllers/tasks/mappers/response/public_task_response_mapper'
import {
  mapApplyForTaskApiBody,
  mapMyApplicationsPageProps,
  mapTaskApplicationsPageProps,
} from '#controllers/tasks/mappers/response/task_application_response_mapper'
import {
  mapTaskCreateApiBody,
  mapTaskDetailPageProps,
  mapTaskEditPageProps,
  mapTaskSortOrderApiBody,
  mapTaskStatusApiBody,
  mapTaskUpdateApiBody,
} from '#controllers/tasks/mappers/response/task_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

test.group('Task controller response mappers', () => {
  test('public task mapper serializes Lucid-like objects and preserves cached plain objects', ({
    assert,
  }) => {
    const data = mapPublicTaskCollectionResponse([
      serializable({ id: 'task-1', title: 'Serializable task' }),
      { id: 'task-2', title: 'Cached task' },
    ])

    assert.deepEqual(data, [
      { id: 'task-1', title: 'Serializable task' },
      { id: 'task-2', title: 'Cached task' },
    ])
  })

  test('public task page/api mappers keep response envelopes stable', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'task-1', title: 'Task one' })],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }
    const filters = new GetPublicTasksDTO({
      page: 1,
      per_page: 10,
      skill_ids: ['skill-1'],
      keyword: 'task',
      difficulty: 'hard',
      min_budget: 10,
      max_budget: 100,
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    assert.deepEqual(mapPublicTasksApiBody(result), {
      data: [{ id: 'task-1', title: 'Task one' }],
      meta: result.meta,
    })
    assert.deepEqual(mapPublicTasksPageProps(result, filters), {
      tasks: [{ id: 'task-1', title: 'Task one' }],
      meta: result.meta,
      filters: {
        skill_ids: ['skill-1'],
        keyword: 'task',
        difficulty: 'hard',
        min_budget: 10,
        max_budget: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    })
  })

  test('task application mappers keep page and api payloads stable', ({ assert }) => {
    const ownerResult = {
      data: [
        serializable({
          id: 'app-1',
          application_status: 'pending',
          message: 'Tôi có thể làm task này',
          expected_rate: '1500000',
          applied_at: '2026-04-09T10:30:00.000Z',
          applicant: {
            id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
          },
        }),
      ],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }
    const myResult = {
      data: [
        serializable({
          id: 'app-2',
          task_id: 'task-2',
          application_status: 'approved',
          message: 'Đã gửi portfolio',
          expected_rate: 2500000,
          applied_at: '2026-04-08T08:00:00.000Z',
          reviewed_at: null,
          task: {
            id: 'task-2',
            title: 'Refactor task controller',
            status: 'in_progress',
          },
        }),
      ],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }

    assert.deepEqual(mapApplyForTaskApiBody(serializable({ id: 'app-1' })), {
      success: true,
      data: { id: 'app-1' },
    })
    assert.deepEqual(mapTaskApplicationsPageProps(ownerResult, 'task-1', 'pending'), {
      taskId: 'task-1',
      applications: [
        {
          id: 'app-1',
          user: {
            id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
          },
          status: 'pending',
          cover_letter: 'Tôi có thể làm task này',
          proposed_budget: 1500000,
          estimated_duration: null,
          created_at: '2026-04-09T10:30:00.000Z',
        },
      ],
      meta: ownerResult.meta,
      statusFilter: 'pending',
    })
    assert.deepEqual(mapMyApplicationsPageProps(myResult, 'all'), {
      applications: [
        {
          id: 'app-2',
          task_id: 'task-2',
          task: {
            id: 'task-2',
            title: 'Refactor task controller',
            status: 'in_progress',
          },
          status: 'approved',
          cover_letter: 'Đã gửi portfolio',
          proposed_budget: 2500000,
          estimated_duration: null,
          created_at: '2026-04-08T08:00:00.000Z',
          updated_at: '2026-04-08T08:00:00.000Z',
        },
      ],
      meta: myResult.meta,
      statusFilter: 'all',
    })
  })

  test('task detail and task mutation mappers keep response envelopes stable', ({ assert }) => {
    const task = serializable({ id: 'task-1', title: 'Mapped task' })

    assert.deepEqual(mapTaskCreateApiBody(task), {
      success: true,
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskUpdateApiBody(task), {
      success: true,
      task: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskStatusApiBody(task, 'updated'), {
      success: true,
      message: 'updated',
      task: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskSortOrderApiBody(task), {
      success: true,
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(
      mapTaskDetailPageProps({
        task,
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
        auditLogs: [{ id: 'log-1' }],
      }),
      {
        task: { id: 'task-1', title: 'Mapped task' },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
        auditLogs: [{ id: 'log-1' }],
      }
    )
    assert.deepEqual(
      mapTaskEditPageProps({
        task,
        metadata: {
          statuses: [{ value: 'todo', label: 'Todo' }],
          labels: [{ value: 'bug', label: 'Bug' }],
          priorities: [{ value: 'high', label: 'High' }],
          users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
          parentTasks: [{ id: 'parent-1', title: 'Parent', task_status_id: 'status-1' }],
          projects: [{ id: 'project-1', name: 'Platform' }],
        },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
      }),
      {
        task: { id: 'task-1', title: 'Mapped task' },
        metadata: {
          statuses: [{ value: 'todo', label: 'Todo' }],
          labels: [{ value: 'bug', label: 'Bug' }],
          priorities: [{ value: 'high', label: 'High' }],
          users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
          parentTasks: [{ id: 'parent-1', title: 'Parent', task_status_id: 'status-1' }],
          projects: [{ id: 'project-1', name: 'Platform' }],
        },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
      }
    )
  })
})
