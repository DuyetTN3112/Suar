import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import { makeGetUserNotifications } from '#composition/notifications/notification-feed/notification_feed_composition'
import { organizationCacheInvalidator } from '#composition/organizations/access/organization_cache_composition'
import { organizationUserReaderWriter } from '#composition/organizations/directory/organization_user_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
} from '#composition/organizations/persistence/organization_persistence_composition'
import { ForbiddenPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/action_context'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/invitations/process_join_request_command'
import RequestOrganizationJoinCommand from '#modules/organizations/actions/commands/invitations/request_organization_join_command'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/invitations/process_join_request_dto'
import OrganizationUser from '#modules/organizations/infra/models/members/organization_user'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/members/organization_user_repository/write/mutation_queries'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, OrganizationFactory, cleanupTestData } from '#tests/helpers/factories'

const makeRequestJoinCommand = (
  context: ConstructorParameters<typeof RequestOrganizationJoinCommand>[0]
) =>
  new RequestOrganizationJoinCommand(
    context,
    organizationUserReaderWriter,
    notificationPublicApi,
    organizationTransactionRunner,
    organizationReader,
    organizationMembershipRepository
  )

const makeProcessJoinRequestCommand = (
  context: ConstructorParameters<typeof ProcessJoinRequestCommand>[0],
  notification: ConstructorParameters<typeof ProcessJoinRequestCommand>[1]
) =>
  new ProcessJoinRequestCommand(
    context,
    notification,
    organizationTransactionRunner,
    organizationMembershipRepository,
    organizationEventPublisher,
    organizationCacheInvalidator
  )

test.group('Integration | Organization Join Request (v3 - via organization_users)', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('user creates join request as pending membership', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    const membership = await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.equal(membership.organization_id, org.id)
    assert.equal(membership.user_id, user.id)
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
  })

  test('approve flow updates status and removes the user from pending query results', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await membershipMutations.updateStatus(org.id, user.id, OrganizationUserStatus.APPROVED)

    const membership = await membershipQueries.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }

    assert.equal(membership.status, OrganizationUserStatus.APPROVED)
    const pendingMembers = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('status', OrganizationUserStatus.PENDING)
    assert.isFalse(pendingMembers.some((entry) => entry.user_id === user.id))
  })

  test('reject flow keeps membership row but marks it as rejected', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await membershipMutations.updateStatus(org.id, user.id, OrganizationUserStatus.REJECTED)

    const membership = await membershipQueries.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }
    assert.equal(membership.status, OrganizationUserStatus.REJECTED)
    assert.isTrue(await membershipQueries.isMember(user.id, org.id))
  })

  test('pending membership counts as membership but not approved membership', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    assert.isTrue(await membershipQueries.isMember(user.id, org.id))
    assert.isFalse(await membershipQueries.isApprovedMember(user.id, org.id))
  })

  test('approved members cannot create duplicate join requests', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const command = makeRequestJoinCommand(makeSystemOrganizationActionContext(owner.id))

    await assert.rejects(() => command.execute(org.id), BusinessLogicException)

    const memberships = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', owner.id)
    assert.lengthOf(memberships, 1)
    assert.equal(memberships[0]?.status, OrganizationUserStatus.APPROVED)
  })

  test('join request notifies only approved owners and admins', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const approvedAdmin = await UserFactory.create({ username: 'approved_admin_request' })
    const approvedMember = await UserFactory.create({ username: 'approved_member_request' })
    const pendingAdmin = await UserFactory.create({ username: 'pending_admin_request' })
    const requester = await UserFactory.create({ email: 'join_requester@example.com' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: approvedAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: approvedMember.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: pendingAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.PENDING,
    })

    const command = makeRequestJoinCommand(makeSystemOrganizationActionContext(requester.id))

    await command.execute(org.id)

    const ownerNotifications = await db
      .from('notifications')
      .where('user_id', owner.id)
      .where('type', 'organization_join_request')
      .where('related_entity_id', org.id)
    const adminNotifications = await db
      .from('notifications')
      .where('user_id', approvedAdmin.id)
      .where('type', 'organization_join_request')
      .where('related_entity_id', org.id)
    const memberNotifications = await db
      .from('notifications')
      .where('user_id', approvedMember.id)
      .where('type', 'organization_join_request')
      .where('related_entity_id', org.id)
    const pendingAdminNotifications = await db
      .from('notifications')
      .where('user_id', pendingAdmin.id)
      .where('type', 'organization_join_request')
      .where('related_entity_id', org.id)
    const requesterNotifications = await makeGetUserNotifications(
      makeSystemOrganizationActionContext(requester.id)
    ).handle({
      page: 1,
      limit: 20,
    })

    assert.lengthOf(ownerNotifications, 1)
    assert.lengthOf(adminNotifications, 1)
    const ownerNotification = ownerNotifications[0] as { message: string }
    const adminNotification = adminNotifications[0] as { message: string }
    assert.equal(ownerNotification.message, `${requester.username} đã gửi yêu cầu tham gia tổ chức "${org.name}".`)
    assert.equal(adminNotification.message, `${requester.username} đã gửi yêu cầu tham gia tổ chức "${org.name}".`)
    assert.lengthOf(memberNotifications, 0)
    assert.lengthOf(pendingAdminNotifications, 0)
    assert.equal(requesterNotifications.unread_count, 0)
  })

  test('outsiders cannot process join requests and the request remains pending', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const requester = await UserFactory.create()
    const outsider = await UserFactory.create()
    const notificationCalls: unknown[] = []

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: requester.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const command = makeProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(outsider.id),
      {
        stage: (payload) => {
          notificationCalls.push(payload)
          return Promise.resolve(null)
        },
      }
    )

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      ForbiddenPolicyViolationException
    )

    const membership = await membershipQueries.findMembership(org.id, requester.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, OrganizationUserStatus.PENDING)
    assert.lengthOf(notificationCalls, 0)
  })

  test('pending admins cannot process join requests and the request remains pending', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const requester = await UserFactory.create()
    const pendingAdmin = await UserFactory.create()
    const notificationCalls: unknown[] = []

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: requester.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: pendingAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.PENDING,
    })

    const command = makeProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(pendingAdmin.id),
      {
        stage: (payload) => {
          notificationCalls.push(payload)
          return Promise.resolve(null)
        },
      }
    )

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      ForbiddenPolicyViolationException
    )

    const membership = await membershipQueries.findMembership(org.id, requester.id)
    assert.isNotNull(membership)
    assert.equal(membership?.status, OrganizationUserStatus.PENDING)
    assert.lengthOf(notificationCalls, 0)
  })

  test('processing a missing pending join request returns a controlled not-found error', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const requester = await UserFactory.create()
    const notificationCalls: unknown[] = []
    const command = makeProcessJoinRequestCommand(makeSystemOrganizationActionContext(owner.id), {
      stage: (payload) => {
        notificationCalls.push(payload)
        return Promise.resolve(null)
      },
    })

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      NotFoundException
    )
    assert.isNull(await membershipQueries.findMembership(org.id, requester.id))
    assert.lengthOf(notificationCalls, 0)
  })
})
