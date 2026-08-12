import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { BusinessPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
  globalCacheGenerationNamespaces,
  organizationUserCacheGenerationNamespaces,
  taskListCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import AssignTaskCommand from '#modules/tasks/actions/commands/task-assignment/assign_task_command'
import AssignTaskDTO from '#modules/tasks/actions/dtos/request/assign_task_dto'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusScenario from '#modules/tasks/tests/backend/support/task_status_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

type NotificationPayload = Parameters<NotificationStager['stage']>[0]
const taskEvents = new InProcessTaskEventPublisher()

class NotificationSpy implements NotificationStager {
  public calls: NotificationPayload[] = []

  public stage(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

class FailOnSecondNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<null> {
    this.calls += 1
    return this.calls === 2
      ? Promise.reject(new Error('second assignment notification staging failed'))
      : Promise.resolve(null)
  }
}

function buildActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
    organizationId,
  }
}

async function countTaskAuditLogs(taskId: string, action: string): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('entity_type', 'task')
    .where('entity_id', taskId)
    .where('action', action)
    .count('* as count')) as { count: number | string }[]
  return Number(result[0]?.count ?? 0)
}

async function resolveGenerationKey(
  namespaces: readonly string[],
  logicalKey: string
): Promise<string> {
  const physicalKey = await RedisCacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  if (!physicalKey) {
    throw new Error(`Expected cache generation key to resolve for ${logicalKey}`)
  }
  return physicalKey
}

test.group('Integration | Assign Task', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('assigns a task to an org member, records audit, and notifies the assignee', async ({
    assert,
    cleanup,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })
    const notificationSpy = new NotificationSpy()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: assignee.id,
    })
    const generationEntries = [
      {
        logicalKey: `task:audit:${task.id}:viewer:${owner.id}:limit:20`,
        namespaces: entityCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
          'task',
          task.id
        ),
      },
      {
        logicalKey: `tasks:list:v2:org:${org.id}:scope:all:query:assignment-test`,
        namespaces: taskListCacheGenerationNamespaces(org.id),
      },
      {
        logicalKey: `tasks:public:v2:query:assignment-test`,
        namespaces: globalCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.publicTasks
        ),
      },
      {
        logicalKey: `task:user:user:${assignee.id}:org:${org.id}:page:1`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.userTasks,
          org.id,
          assignee.id
        ),
      },
      {
        logicalKey: `tasks:grouped:org:${org.id}:user:${assignee.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.groupedTasks,
          org.id,
          assignee.id
        ),
      },
      {
        logicalKey: `tasks:timeline:org:${org.id}:user:${assignee.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.timelineTasks,
          org.id,
          assignee.id
        ),
      },
      {
        logicalKey: `task:stats:org:${org.id}:user:${assignee.id}`,
        namespaces: organizationUserCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskStatistics,
          org.id,
          assignee.id
        ),
      },
      {
        logicalKey: `task:applications:page:1:taskId:${task.id}:userId:${owner.id}`,
        namespaces: entityCacheGenerationNamespaces(
          CACHE_COLLECTION_GENERATION_NAMESPACES.taskApplications,
          'task',
          task.id
        ),
      },
    ] as const
    const oldGenerationKeys = await Promise.all(
      generationEntries.map(({ namespaces, logicalKey }) =>
        resolveGenerationKey(namespaces, logicalKey)
      )
    )
    await Promise.all([
      ...oldGenerationKeys.map((key) => RedisCacheStore.set(key, { stale: true })),
    ])

    const updatedTask = await command.execute(dto)
    const nextGenerationKeys = await Promise.all(
      generationEntries.map(({ namespaces, logicalKey }) =>
        resolveGenerationKey(namespaces, logicalKey)
      )
    )
    cleanup(async () => {
      await Promise.all(
        [...oldGenerationKeys, ...nextGenerationKeys].map((key) =>
          RedisCacheStore.deleteBestEffort(key)
        )
      )
    })

    const persistedTask = await Task.findOrFail(task.id)

    assert.equal(updatedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.assigned_to, assignee.id)
    assert.equal(persistedTask.updated_by, owner.id)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 1)
    assert.equal(await countTaskAuditLogs(task.id, 'task.assignment.completed'), 1)
    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.recipientId, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_assigned')
    for (const [index, nextKey] of nextGenerationKeys.entries()) {
      const oldKey = oldGenerationKeys[index]
      assert.notEqual(nextKey, oldKey)
      assert.isNull(await RedisCacheStore.get(nextKey))
      assert.deepEqual(await RedisCacheStore.get(oldKey ?? ''), { stale: true })
    }
  })

  test('does not assign a Docs item', async ({ assert }) => {
    const scenario = await TaskStatusScenario.create()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: scenario.organizationId,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await scenario.createTask({ task_status_slug: 'docs' })
    await task.merge({ assigned_to: null }).save()
    const command = new AssignTaskCommand(
      buildActionContext(scenario.ownerId, scenario.organizationId),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )

    await assert.rejects(
      () => command.execute(new AssignTaskDTO({ task_id: task.id, assigned_to: assignee.id })),
      BusinessPolicyViolationException
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
  })

  test('reassigning a task notifies the new assignee and the previous assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const currentAssignee = await UserFactory.create()
    const newAssignee = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: currentAssignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newAssignee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: currentAssignee.id,
    })

    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: newAssignee.id,
    })

    await command.execute(dto)

    const persistedTask = await Task.findOrFail(task.id)

    assert.equal(persistedTask.assigned_to, newAssignee.id)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 1)

    const notifications = (await db
      .from('notifications')
      .select('event_id', 'user_id', 'type', 'category', 'action')
      .where('related_entity_id', task.id)
      .whereIn('type', ['task_assigned', 'task_reassigned'])) as {
      event_id: string
      user_id: string
      type: string
      category: string
      action: { routeName?: string } | null
    }[]
    assert.lengthOf(notifications, 2)

    const occurredAt = persistedTask.updated_at.toUTC().toISO()
    assert.isNotNull(occurredAt)
    if (!occurredAt) return
    const expected = [
      {
        recipientId: newAssignee.id,
        type: 'task_assigned',
        eventName: 'task.assigned',
      },
      {
        recipientId: currentAssignee.id,
        type: 'task_reassigned',
        eventName: 'task.reassigned',
      },
    ]
    for (const expectedNotification of expected) {
      const notification = notifications.find(
        (candidate) =>
          candidate.user_id === expectedNotification.recipientId &&
          candidate.type === expectedNotification.type
      )
      assert.isDefined(notification)
      if (!notification) continue
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: expectedNotification.eventName,
          businessEventId: `${task.id}:${currentAssignee.id}:${newAssignee.id}:${occurredAt}`,
          recipientId: expectedNotification.recipientId,
        })
      )
      assert.equal(notification.category, 'task')
      assert.equal(notification.action?.routeName, 'tasks.show')
    }
    assert.lengthOf(
      await db.from('notification_outbox').whereIn(
        'source_event_id',
        notifications.map((notification) => notification.event_id)
      ),
      4
    )
  })

  test('unassigning a task clears the assignee and notifies the previous assignee', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
    })

    const notificationSpy = new NotificationSpy()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: null,
    })

    await command.execute(dto)

    const persistedTask = await Task.findOrFail(task.id)

    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'unassign'), 1)
    assert.lengthOf(notificationSpy.calls, 1)
    assert.equal(notificationSpy.calls[0]?.recipientId, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_unassigned')
  })

  test('rejects missing assignees and leaves the task unchanged', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })

    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: testId(),
    })

    await assert.rejects(() => command.execute(dto), NotFoundException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
  })

  test('rejects assignees outside the organization and leaves the task unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: null,
    })

    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notificationPublicApi,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )
    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: outsider.id,
    })
    const unchangedTaskCacheKey = `task:audit:${task.id}:viewer:${owner.id}:limit:20`
    await RedisCacheStore.set(unchangedTaskCacheKey, { assigned_to: null })

    await assert.rejects(() => command.execute(dto), BusinessPolicyViolationException)

    const persistedTask = await Task.findOrFail(task.id)
    assert.isNull(persistedTask.assigned_to)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
    assert.deepEqual(await RedisCacheStore.get(unchangedTaskCacheKey), { assigned_to: null })
  })

  test('second reassign notification failure rolls assignment and audit back', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const currentAssignee = await UserFactory.create()
    const newAssignee = await UserFactory.create()
    for (const member of [currentAssignee, newAssignee]) {
      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: member.id,
        org_role: 'org_member',
        status: 'approved',
      })
    }
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: currentAssignee.id,
    })
    const notification = new FailOnSecondNotificationStager()
    const command = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      notification,
      taskExternalDeps,
      new TaskCacheInvalidator(),
      taskEvents
    )

    await assert.rejects(
      () =>
        command.execute(
          new AssignTaskDTO({
            task_id: task.id,
            assigned_to: newAssignee.id,
          })
        ),
      'second assignment notification staging failed'
    )

    const persistedTask = await Task.findOrFail(task.id)
    assert.equal(notification.calls, 2)
    assert.equal(persistedTask.assigned_to, currentAssignee.id)
    assert.equal(await countTaskAuditLogs(task.id, 'assign'), 0)
  })
})
