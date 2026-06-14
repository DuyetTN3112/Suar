import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { organizationCacheInvalidator } from '#composition/organizations/access/organization_cache_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organizations/persistence/organization_persistence_composition'
import { organizationUserReaderWriter } from '#composition/organizations/directory/organization_user_composition'
import { AuditAction } from '#modules/audit/public_contracts/audit_constants'
import {
  BusinessPolicyViolationException,
  ForbiddenPolicyViolationException,
} from '#modules/authorization/public_contracts/policy_violation'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import AcceptOrganizationInvitationCommand from '#modules/organizations/actions/commands/invitations/accept_organization_invitation_command'
import InviteUserCommand from '#modules/organizations/actions/commands/invitations/invite_user_command'
import RejectOrganizationInvitationCommand from '#modules/organizations/actions/commands/invitations/reject_organization_invitation_command'
import { InviteUserDTO } from '#modules/organizations/actions/dtos/request/invitations/invite_user_dto'
import * as listingQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import { OrganizationMembershipScenario } from '#modules/organizations/tests/backend/support/members/membership_scenario'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, ProjectMemberFactory, UserFactory } from '#tests/helpers/factories'

const makeInviteCommand = (
  context: ConstructorParameters<typeof InviteUserCommand>[0],
  notification: ConstructorParameters<typeof InviteUserCommand>[1]
) =>
  new InviteUserCommand(
    context,
    notification,
    organizationUserReaderWriter,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository
  )

const makeAcceptCommand = (
  context: ConstructorParameters<typeof AcceptOrganizationInvitationCommand>[0],
  notification: ConstructorParameters<typeof AcceptOrganizationInvitationCommand>[1]
) =>
  new AcceptOrganizationInvitationCommand(
    context,
    notification,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationEventPublisher
  )

const makeRejectCommand = (
  context: ConstructorParameters<typeof RejectOrganizationInvitationCommand>[0],
  notification: ConstructorParameters<typeof RejectOrganizationInvitationCommand>[1]
) =>
  new RejectOrganizationInvitationCommand(
    context,
    notification,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository,
    organizationCacheInvalidator
  )

async function countPlatformAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

async function countOrganizationMemberships(
  organizationId: string,
  userId: string
): Promise<number> {
  const result = (await db
    .from('organization_users')
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
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
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const oldMembershipCacheKey = await scenario.seedMemberListCache([member.id])

    await scenario.executeRoleChange(scenario.owner.id, member.id, OrganizationRole.ADMIN)
    const newMembershipCacheKey = await scenario.resolveMemberListCacheKey()

    const membership = await membershipQueries.findMembership(scenario.org.id, member.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected promoted member to keep a membership row')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.ADMIN)
    assert.isTrue(await membershipQueries.isAdminOrOwner(member.id, scenario.org.id))
    assert.notEqual(newMembershipCacheKey, oldMembershipCacheKey)
    assert.isNull(await RedisCacheStore.get(newMembershipCacheKey))
    assert.deepEqual(await RedisCacheStore.get(oldMembershipCacheKey), { userIds: [member.id] })

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
    assert.equal(auditLog.old_values?.['org_role'], OrganizationRole.MEMBER)
    assert.equal(auditLog.new_values?.['org_role'], OrganizationRole.ADMIN)
    assert.equal(auditLog.new_values?.['user_id'], member.id)
    assert.equal(
      await countPlatformAuditEvents(
        'organization.member_role_change.completed',
        'organization_membership',
        member.id
      ),
      1
    )
  })

  test('pending admins cannot change another member role', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingAdmin = await scenario.addMember({
      role: OrganizationRole.ADMIN,
      status: 'pending',
    })
    const targetMember = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const membershipCacheKey = await scenario.seedMemberListCache([targetMember.id])

    await assert.rejects(
      () => scenario.executeRoleChange(pendingAdmin.id, targetMember.id, OrganizationRole.ADMIN),
      ForbiddenPolicyViolationException
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, targetMember.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected target member to remain in the organization')
      return
    }
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
    assert.isFalse(await membershipQueries.isAdminOrOwner(targetMember.id, scenario.org.id))
    assert.deepEqual(await RedisCacheStore.get(membershipCacheKey), { userIds: [targetMember.id] })
    assert.equal(await scenario.resolveMemberListCacheKey(), membershipCacheKey)

    const notifications = await scenario.getUserNotifications(targetMember.id)
    assert.lengthOf(notifications.notifications, 0)

    const auditLogs = await scenario.getOrganizationAuditLogs(AuditAction.UPDATE_MEMBER_ROLE)
    assert.lengthOf(auditLogs, 0)
  })

  test('admins cannot change the owner role', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const admin = await scenario.addMember({ role: OrganizationRole.ADMIN })

    await assert.rejects(
      () => scenario.executeRoleChange(admin.id, scenario.owner.id, OrganizationRole.MEMBER),
      BusinessPolicyViolationException
    )

    const ownerMembership = await membershipQueries.findMembership(
      scenario.org.id,
      scenario.owner.id
    )
    assert.isNotNull(ownerMembership)
    assert.equal(ownerMembership?.org_role, OrganizationRole.OWNER)
  })

  test('admins cannot remove the organization owner', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const admin = await scenario.addMember({ role: OrganizationRole.ADMIN })

    await assert.rejects(
      () => scenario.executeMemberRemoval(admin.id, scenario.owner.id, 'Invalid owner removal'),
      BusinessPolicyViolationException
    )

    const ownerMembership = await membershipQueries.findMembership(
      scenario.org.id,
      scenario.owner.id
    )
    assert.isNotNull(ownerMembership)
    assert.equal(ownerMembership?.org_role, OrganizationRole.OWNER)
  })

  test('owners cannot mutate members from another organization', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const foreignScenario = await OrganizationMembershipScenario.create()
    const foreignMember = await foreignScenario.addMember({ role: OrganizationRole.MEMBER })

    await assert.rejects(
      () => scenario.executeRoleChange(scenario.owner.id, foreignMember.id, OrganizationRole.ADMIN),
      NotFoundException
    )
    await assert.rejects(
      () =>
        scenario.executeMemberRemoval(
          scenario.owner.id,
          foreignMember.id,
          'Invalid foreign removal'
        ),
      NotFoundException
    )

    const foreignMembership = await membershipQueries.findMembership(
      foreignScenario.org.id,
      foreignMember.id
    )
    assert.isNotNull(foreignMembership)
    assert.equal(foreignMembership?.org_role, OrganizationRole.MEMBER)
    assert.equal(foreignMembership?.status, 'approved')
  })

  test('owner removal unassigns the member tasks, decreases member count, and emits audit data', async ({
    assert,
  }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const memberToRemove = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const remainingMember = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const project = await scenario.createOwnedProject()
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: memberToRemove.id,
    })
    const removedTask = await scenario.createAssignedTask(project, memberToRemove.id)
    const preservedTask = await scenario.createAssignedTask(project, remainingMember.id)

    const beforeCount = await listingQueries.countMembers(scenario.org.id)
    assert.equal(beforeCount, 3)

    await scenario.executeMemberRemoval(scenario.owner.id, memberToRemove.id, ' No longer staffed ')

    const afterCount = await listingQueries.countMembers(scenario.org.id)
    assert.equal(afterCount, 2)
    assert.isNull(await membershipQueries.findMembership(scenario.org.id, memberToRemove.id))

    const updatedRemovedTask = await Task.findOrFail(removedTask.id)
    const updatedPreservedTask = await Task.findOrFail(preservedTask.id)
    assert.isNull(updatedRemovedTask.assigned_to)
    assert.equal(updatedPreservedTask.assigned_to, remainingMember.id)
    const staleProjectAccess = (await db
      .from('project_members')
      .where('project_id', project.id)
      .where('user_id', memberToRemove.id)
      .first()) as unknown
    assert.isNull(staleProjectAccess)

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
    assert.equal(auditLog.new_values?.['removed_user_id'], memberToRemove.id)
    assert.equal(auditLog.new_values?.['reason'], 'No longer staffed')
    assert.equal(
      await countPlatformAuditEvents(
        'organization.member_removal.completed',
        'organization_membership',
        memberToRemove.id
      ),
      1
    )
  })

  test('owner approves a pending join request and persists structured workflow audit evidence', async ({
    assert,
  }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const requester = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
    })

    await scenario.executeJoinRequestDecision(scenario.owner.id, requester.id, true, ' Approved ')

    const membership = await membershipQueries.findMembership(scenario.org.id, requester.id)
    assert.isNotNull(membership)
    if (!membership) {
      assert.fail('Expected requester membership to remain after approval')
      return
    }

    assert.equal(membership.status, 'approved')
    assert.equal(
      await countPlatformAuditEvents(
        'organization.join_request.processed',
        'organization_join_request',
        requester.id
      ),
      1
    )
  })

  test('owner cannot invite an already approved member again', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const notificationCalls: unknown[] = []
    const command = makeInviteCommand(makeSystemOrganizationActionContext(scenario.owner.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(scenario.org.id, member.email ?? '', OrganizationRole.MEMBER)
        ),
      ConflictException
    )

    assert.equal(await countOrganizationMemberships(scenario.org.id, member.id), 1)
    assert.lengthOf(notificationCalls, 0)
  })

  test('owner cannot create a second pending invitation for the same user', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const notificationCalls: unknown[] = []
    const command = makeInviteCommand(makeSystemOrganizationActionContext(scenario.owner.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(scenario.org.id, pendingMember.email ?? '', OrganizationRole.MEMBER)
        ),
      ConflictException
    )

    const membership = await membershipQueries.findMembership(scenario.org.id, pendingMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'pending')
    assert.equal(await countOrganizationMemberships(scenario.org.id, pendingMember.id), 1)
    assert.lengthOf(notificationCalls, 0)
  })

  test('plain members cannot invite users', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const member = await scenario.addMember({ role: OrganizationRole.MEMBER })
    const invitee = await UserFactory.create()
    const notificationCalls: unknown[] = []
    const command = makeInviteCommand(makeSystemOrganizationActionContext(member.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(scenario.org.id, invitee.email ?? '', OrganizationRole.MEMBER)
        ),
      ForbiddenPolicyViolationException
    )

    assert.isNull(await membershipQueries.findMembership(scenario.org.id, invitee.id))
    assert.lengthOf(notificationCalls, 0)
  })

  test('owners cannot invite themselves again', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const notificationCalls: unknown[] = []
    const command = makeInviteCommand(makeSystemOrganizationActionContext(scenario.owner.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(scenario.org.id, scenario.owner.email ?? '', OrganizationRole.MEMBER)
        ),
      ConflictException
    )

    assert.equal(await countOrganizationMemberships(scenario.org.id, scenario.owner.id), 1)
    assert.lengthOf(notificationCalls, 0)
  })

  test('owners cannot invite inactive users', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const notificationCalls: unknown[] = []
    const command = makeInviteCommand(makeSystemOrganizationActionContext(scenario.owner.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () =>
        command.execute(
          new InviteUserDTO(scenario.org.id, inactiveUser.email ?? '', OrganizationRole.MEMBER)
        ),
      NotFoundException
    )

    assert.isNull(await membershipQueries.findMembership(scenario.org.id, inactiveUser.id))
    assert.lengthOf(notificationCalls, 0)
  })

  test('invitee can accept their own pending invitation', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const notificationCalls: unknown[] = []
    const command = makeAcceptCommand(makeSystemOrganizationActionContext(pendingMember.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await command.execute(scenario.org.id)

    const membership = await membershipQueries.findMembership(scenario.org.id, pendingMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'approved')
    assert.lengthOf(notificationCalls, 1)
  })

  test('other users cannot accept someone else pending invitation', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const outsider = await UserFactory.create()
    const notificationCalls: unknown[] = []
    const command = makeAcceptCommand(makeSystemOrganizationActionContext(outsider.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(() => command.execute(scenario.org.id), NotFoundException)

    const membership = await membershipQueries.findMembership(scenario.org.id, pendingMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'pending')
    assert.isNull(await membershipQueries.findMembership(scenario.org.id, outsider.id))
    assert.lengthOf(notificationCalls, 0)
  })

  test('invitee can reject their own pending invitation', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const notificationCalls: unknown[] = []
    const command = makeRejectCommand(makeSystemOrganizationActionContext(pendingMember.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await command.execute(scenario.org.id)

    const membership = await membershipQueries.findMembership(scenario.org.id, pendingMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'rejected')
    assert.lengthOf(notificationCalls, 1)
  })

  test('invitee cannot accept an invitation that was already rejected', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const rejectedMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    await db
      .from('organization_users')
      .where('organization_id', scenario.org.id)
      .where('user_id', rejectedMember.id)
      .update({ status: 'rejected' })
    const notificationCalls: unknown[] = []
    const command = makeAcceptCommand(makeSystemOrganizationActionContext(rejectedMember.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(() => command.execute(scenario.org.id), NotFoundException)

    const membership = await membershipQueries.findMembership(scenario.org.id, rejectedMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'rejected')
    assert.lengthOf(notificationCalls, 0)
  })

  test('other users cannot reject someone else pending invitation', async ({ assert }) => {
    const scenario = await OrganizationMembershipScenario.create()
    const pendingMember = await scenario.addMember({
      role: OrganizationRole.MEMBER,
      status: 'pending',
      invitedById: scenario.owner.id,
    })
    const outsider = await UserFactory.create()
    const notificationCalls: unknown[] = []
    const command = makeRejectCommand(makeSystemOrganizationActionContext(outsider.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(() => command.execute(scenario.org.id), NotFoundException)

    const membership = await membershipQueries.findMembership(scenario.org.id, pendingMember.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, 'pending')
    assert.isNull(await membershipQueries.findMembership(scenario.org.id, outsider.id))
    assert.lengthOf(notificationCalls, 0)
  })
})
