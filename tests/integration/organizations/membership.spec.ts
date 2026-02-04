import { test } from '@japa/runner'

import ForbiddenException from '#exceptions/forbidden_exception'
import CacheService from '#infra/cache/cache_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import Task from '#infra/tasks/models/task'
import { AuditAction } from '#modules/audit/constants/audit_constants'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { OrganizationMembershipScenario } from '#tests/integration/organizations/support/membership_scenario'

test.group('Integration | Organization Membership', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner promotes a member to admin and the change is observable through side effects', async ({
    assert,
  }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const membershipCacheKey = scenario.memberListCacheKey()
    await scenario.seedMemberListCache([member.id])

    await scenario.executeRoleChange(scenario.owner.id, member.id, OrganizationRole.ADMIN)

    const membership = await OrganizationUserRepository.findMembership(scenario.org.id, member.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected promoted member to keep a membership row')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.ADMIN)
    assert.isTrue(await OrganizationUserRepository.isAdminOrOwner(member.id, scenario.org.id))
    assert.isNull(await CacheService.get(membershipCacheKey))

    const notifications = await scenario.getUserNotifications(member.id)
    const roleChanged = notifications.notifications.find(
      (notification) => notification.type === 'role_changed'
    )
    assert.isDefined(roleChanged)
    if (!roleChanged) {
      assert.fail('Expected a role_changed notification for the promoted member')
      return
    }
    assert.equal(roleChanged.related_entity_id, scenario.org.id)
    assert.include(roleChanged.message, 'Quản trị viên')

    const auditLogs = await scenario.getOrganizationAuditLogs(AuditAction.UPDATE_MEMBER_ROLE)
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
    const scenario = await OrganizationMembershipScenario.create()
    const pendingAdmin = await scenario.addMember({
      role: OrganizationRole.ADMIN,
      status: 'pending',
    })
    const targetMember = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const membershipCacheKey = scenario.memberListCacheKey()
    await scenario.seedMemberListCache([targetMember.id])

    await assert.rejects(
      () => scenario.executeRoleChange(pendingAdmin.id, targetMember.id, OrganizationRole.ADMIN),
      ForbiddenException
    )

    const membership = await OrganizationUserRepository.findMembership(
      scenario.org.id,
      targetMember.id
    )
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected target member to remain in the organization')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
    assert.isFalse(
      await OrganizationUserRepository.isAdminOrOwner(targetMember.id, scenario.org.id)
    )
    assert.deepEqual(await CacheService.get(membershipCacheKey), { userIds: [targetMember.id] })

    const notifications = await scenario.getUserNotifications(targetMember.id)
    assert.lengthOf(notifications.notifications, 0)

    const auditLogs = await scenario.getOrganizationAuditLogs(AuditAction.UPDATE_MEMBER_ROLE)
    assert.lengthOf(auditLogs, 0)
  })

  test('owner removal unassigns the member tasks, decreases member count, and emits audit data', async ({
    assert,
  }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const memberToRemove = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const remainingMember = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const project = await scenario.createOwnedProject()
    const removedTask = await scenario.createAssignedTask(project, memberToRemove.id)
    const preservedTask = await scenario.createAssignedTask(project, remainingMember.id)

    const beforeCount = await OrganizationUserRepository.countMembers(scenario.org.id)
    assert.equal(beforeCount, 3)

    await scenario.executeMemberRemoval(scenario.owner.id, memberToRemove.id, ' No longer staffed ')

    const afterCount = await OrganizationUserRepository.countMembers(scenario.org.id)
    assert.equal(afterCount, 2)
    assert.isNull(
      await OrganizationUserRepository.findMembership(scenario.org.id, memberToRemove.id)
    )

    const updatedRemovedTask = await Task.findOrFail(removedTask.id)
    const updatedPreservedTask = await Task.findOrFail(preservedTask.id)
    assert.isNull(updatedRemovedTask.assigned_to)
    assert.equal(updatedPreservedTask.assigned_to, remainingMember.id)

    const notifications = await scenario.getUserNotifications(memberToRemove.id)
    const removalNotification = notifications.notifications.find(
      (notification) => notification.type === 'member_removed'
    )
    assert.isDefined(removalNotification)
    if (!removalNotification) {
      assert.fail('Expected the removed member to receive a removal notification')
      return
    }
    assert.include(removalNotification.message, 'No longer staffed')

    const auditLogs = await scenario.getOrganizationAuditLogs('remove_member')
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
