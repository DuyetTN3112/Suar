import { test } from '@japa/runner'
import RevokeTaskAccessCommand from '#actions/tasks/commands/revoke_task_access_command'
import CreateNotification from '#actions/common/create_notification'
import TaskAssignment from '#models/task_assignment'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import type { ExecutionContext } from '#types/execution_context'

type NotificationPayload = Parameters<CreateNotification['handle']>[0]

class NotificationSpy extends CreateNotification {
  public calls: NotificationPayload[] = []

  public override handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

function buildExecutionContext(userId: string, organizationId: string): ExecutionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
    organizationId,
  }
}

async function countRevokeAuditLogs(assignmentId: string): Promise<number> {
  return await MongoAuditLogModel.countDocuments({
    entity_type: 'task_assignment',
    entity_id: assignmentId,
    action: 'revoke_task_access',
  })
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
    const command = new RevokeTaskAccessCommand(
      buildExecutionContext(owner.id, org.id),
      notificationSpy
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
    assert.equal(notificationSpy.calls[0]?.user_id, assignee.id)
    assert.equal(notificationSpy.calls[0]?.type, 'task_access_revoked')
    assert.equal(notificationSpy.calls[0]?.related_entity_id, task.id)
  })
})
