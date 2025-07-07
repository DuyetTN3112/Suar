import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { OrganizationRole } from '#constants/organization_constants'
import { AuditAction } from '#constants/audit_constants'
import CreateNotification from '#actions/common/create_notification'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import { RemoveMemberDTO } from '#actions/organizations/dtos/request/remove_member_dto'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import { ExecutionContext } from '#types/execution_context'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import AuditLog from '#models/mongo/audit_log'
import Task from '#models/task'
import ForbiddenException from '#exceptions/forbidden_exception'
import CacheService from '#infra/cache/cache_service'

type AuditLogEntry = {
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
}

async function getUserNotifications(userId: string) {
  return new GetUserNotifications(ExecutionContext.system(userId)).handle({
    page: 1,
    limit: 20,
  })
}

async function getOrganizationAuditLogs(
  action: string,
  organizationId: string
): Promise<AuditLogEntry[]> {
  return (await AuditLog.find({
    action,
    entity_type: 'organization',
    entity_id: organizationId,
  })) as AuditLogEntry[]
}

test.group('Integration | Organization Membership', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner promotes a member to admin and the change is observable through side effects', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })
    const membershipCacheKey = `organization:members:${org.id}:member-list`
    await CacheService.set(membershipCacheKey, { userIds: [member.id] })

    const command = new UpdateMemberRoleCommand(
      ExecutionContext.system(owner.id),
      new CreateNotification()
    )
    const dto = new UpdateMemberRoleDTO(org.id, member.id, OrganizationRole.ADMIN)

    await command.execute(dto)

    const membership = await OrganizationUserRepository.findMembership(org.id, member.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected promoted member to keep a membership row')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.ADMIN)
    assert.isTrue(await OrganizationUserRepository.isAdminOrOwner(member.id, org.id))
    assert.isNull(await CacheService.get(membershipCacheKey))

    const notifications = await getUserNotifications(member.id)
    const roleChanged = notifications.notifications.find(
      (notification) => notification.type === 'role_changed'
    )
    assert.isDefined(roleChanged)
    if (!roleChanged) {
      assert.fail('Expected a role_changed notification for the promoted member')
      return
    }
    assert.equal(roleChanged.related_entity_id, org.id)
    assert.include(roleChanged.message, 'Quản trị viên')

    const auditLogs = await getOrganizationAuditLogs(AuditAction.UPDATE_MEMBER_ROLE, org.id)
    assert.lengthOf(auditLogs, 1)
    const [auditLog] = auditLogs
    if (!auditLog) {
      assert.fail('Expected one audit log for the role change')
      return
    }
    assert.equal(auditLog.old_values?.org_role, OrganizationRole.MEMBER)
    assert.equal(auditLog.new_values?.org_role, OrganizationRole.ADMIN)
    assert.equal(auditLog.new_values?.user_id, member.id)
  })

  test('pending admins cannot change another member role', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const pendingAdmin = await UserFactory.create()
    const targetMember = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: 'pending',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: targetMember.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })
    const membershipCacheKey = `organization:members:${org.id}:member-list`
    await CacheService.set(membershipCacheKey, { userIds: [targetMember.id] })

    const command = new UpdateMemberRoleCommand(
      ExecutionContext.system(pendingAdmin.id),
      new CreateNotification()
    )
    const dto = new UpdateMemberRoleDTO(org.id, targetMember.id, OrganizationRole.ADMIN)

    await assert.rejects(() => command.execute(dto), ForbiddenException)

    const membership = await OrganizationUserRepository.findMembership(org.id, targetMember.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected target member to remain in the organization')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
    assert.isFalse(await OrganizationUserRepository.isAdminOrOwner(targetMember.id, org.id))
    assert.deepEqual(await CacheService.get(membershipCacheKey), { userIds: [targetMember.id] })

    const notifications = await getUserNotifications(targetMember.id)
    assert.lengthOf(notifications.notifications, 0)

    const auditLogs = await getOrganizationAuditLogs(AuditAction.UPDATE_MEMBER_ROLE, org.id)
    assert.lengthOf(auditLogs, 0)
  })

  test('owner removal unassigns the member tasks, decreases member count, and emits audit data', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const memberToRemove = await UserFactory.create()
    const remainingMember = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: memberToRemove.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: remainingMember.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const removedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      assigned_to: memberToRemove.id,
    })
    const preservedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      assigned_to: remainingMember.id,
    })

    const beforeCount = await OrganizationUserRepository.countMembers(org.id)
    assert.equal(beforeCount, 3)

    const command = new RemoveMemberCommand(
      ExecutionContext.system(owner.id),
      new CreateNotification()
    )
    const dto = new RemoveMemberDTO(org.id, memberToRemove.id, ' No longer staffed ')

    await command.execute(dto)

    const afterCount = await OrganizationUserRepository.countMembers(org.id)
    assert.equal(afterCount, 2)
    assert.isNull(await OrganizationUserRepository.findMembership(org.id, memberToRemove.id))

    const updatedRemovedTask = await Task.findOrFail(removedTask.id)
    const updatedPreservedTask = await Task.findOrFail(preservedTask.id)
    assert.isNull(updatedRemovedTask.assigned_to)
    assert.equal(updatedPreservedTask.assigned_to, remainingMember.id)

    const notifications = await getUserNotifications(memberToRemove.id)
    const removalNotification = notifications.notifications.find(
      (notification) => notification.type === 'member_removed'
    )
    assert.isDefined(removalNotification)
    if (!removalNotification) {
      assert.fail('Expected the removed member to receive a removal notification')
      return
    }
    assert.include(removalNotification.message, 'No longer staffed')

    const auditLogs = await getOrganizationAuditLogs('remove_member', org.id)
    assert.lengthOf(auditLogs, 1)
    const [auditLog] = auditLogs
    if (!auditLog) {
      assert.fail('Expected one audit log for member removal')
      return
    }
    assert.equal(auditLog.new_values?.removed_user_id, memberToRemove.id)
    assert.equal(auditLog.new_values?.reason, 'No longer staffed')
  })
})
