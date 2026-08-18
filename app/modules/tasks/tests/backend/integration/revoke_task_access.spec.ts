import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeRevokeTaskAccessCommand } from '#composition/organizations/tasks/task_project_notification_composition'
import type {
  NotificationFanoutStagerContract,
  NotificationFanoutTemplateV1Input,
} from '#modules/notifications/public_contracts/notification_fanout'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import type { TaskAccessRevokedEvent } from '#modules/tasks/public_contracts/task_events'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

class NotificationSpy implements NotificationFanoutStagerContract {
  public calls: Array<{
    template: NotificationFanoutTemplateV1Input
    recipientIds: readonly string[]
  }> = []

  public stage(template: NotificationFanoutTemplateV1Input, recipientIds: readonly string[]) {
    this.calls.push({ template, recipientIds })
    return Promise.resolve({
      status: 'staged' as const,
      jobId: randomUUID(),
      targetCount: recipientIds.length,
    })
  }
}

class FailingNotificationFanout implements NotificationFanoutStagerContract {
  public stage() {
    return Promise.reject(new Error('simulated revoke fanout failure'))
  }
}

class TaskEventPublisherSpy implements TaskEventPublisher {
  public accessRevokedEvents: TaskAccessRevokedEvent[] = []

  publishTaskCreated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskUpdated(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskDeleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskStatusChanged(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssignmentCompleted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskAssigned(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationSubmitted(): Promise<void> {
    return Promise.resolve()
  }
  publishTaskApplicationReviewed(): Promise<void> {
    return Promise.resolve()
  }

  publishTaskAccessRevoked(event: TaskAccessRevokedEvent): Promise<void> {
    this.accessRevokedEvents.push(event)
    return Promise.resolve()
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

async function countRevokeAuditLogs(assignmentId: string): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('entity_type', 'task_assignment')
    .where('entity_id', assignmentId)
    .where('action', 'revoke_task_access')
    .count('* as count')) as { count: number | string }[]
  return Number(result[0]?.count ?? 0)
}

test.group('Integration | Revoke Task Access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('revokes an active assignment, records audit, and notifies the assignee', async ({
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
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const notificationSpy = new NotificationSpy()
    const taskEventPublisherSpy = new TaskEventPublisherSpy()
    const command = makeRevokeTaskAccessCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy,
      taskEventPublisherSpy
    )

    await command.handle({
      assignment_id: assignment.id,
      reason: 'Scope changed after reprioritization',
    })

    const persistedAssignment = await TaskAssignment.findOrFail(assignment.id)

    assert.equal(persistedAssignment.assignment_status, 'cancelled')
    assert.include(
      persistedAssignment.completion_notes ?? '',
      'Scope changed after reprioritization'
    )
    assert.equal(await countRevokeAuditLogs(assignment.id), 1)
    assert.lengthOf(notificationSpy.calls, 1)
    assert.deepEqual(notificationSpy.calls[0]?.recipientIds, [assignee.id])
    assert.equal(notificationSpy.calls[0]?.template.type, 'task_access_revoked')
    assert.equal(notificationSpy.calls[0]?.template.subject?.id, task.id)
    assert.lengthOf(taskEventPublisherSpy.accessRevokedEvents, 1)
    assert.deepEqual(taskEventPublisherSpy.accessRevokedEvents[0], {
      taskId: task.id,
      organizationId: org.id,
      userId: assignee.id,
      revokedBy: owner.id,
      reason: 'Scope changed after reprioritization',
    })
  })

  test('notifies project managers while excluding the revoking organization owner', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const projectManager = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: projectManager.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      project_id: project.id,
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: assignee.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const notificationSpy = new NotificationSpy()

    await makeRevokeTaskAccessCommand(
      buildActionContext(owner.id, org.id),
      notificationSpy
    ).handle({
      assignment_id: assignment.id,
      reason: 'Project staffing changed',
    })

    assert.lengthOf(notificationSpy.calls, 2)
    assert.deepEqual(notificationSpy.calls[0]?.recipientIds, [assignee.id])
    assert.deepEqual(notificationSpy.calls[1]?.recipientIds, [projectManager.id])
    assert.equal(
      notificationSpy.calls[1]?.template.type,
      'assignment_revoked_need_action'
    )
  })

  test('rolls assignment and audit back when fanout staging fails', async ({ assert }) => {
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
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const command = makeRevokeTaskAccessCommand(
      buildActionContext(owner.id, org.id),
      new FailingNotificationFanout(),
      new TaskEventPublisherSpy()
    )

    await assert.rejects(
      () =>
        command.handle({
          assignment_id: assignment.id,
          reason: 'Rollback this revoke operation',
        }),
      /simulated revoke fanout failure/
    )

    const persistedAssignment = await TaskAssignment.findOrFail(assignment.id)
    assert.equal(persistedAssignment.assignment_status, 'active')
    assert.equal(await countRevokeAuditLogs(assignment.id), 0)
  })
})
