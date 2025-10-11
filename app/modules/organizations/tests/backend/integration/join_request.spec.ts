import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ProcessJoinRequestCommand from '#modules/organizations/actions/commands/process_join_request_command'
import RequestOrganizationJoinCommand from '#modules/organizations/actions/commands/request_organization_join_command'
import { ProcessJoinRequestDTO } from '#modules/organizations/actions/dtos/request/process_join_request_dto'
import { makeSystemOrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import OrganizationUser from '#modules/organizations/infra/models/organization_user'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, OrganizationFactory, cleanupTestData } from '#tests/helpers/factories'

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
    const command = new RequestOrganizationJoinCommand(
      makeSystemOrganizationActionContext(owner.id)
    )

    await assert.rejects(() => command.execute(org.id), BusinessLogicException)

    const memberships = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', owner.id)
    assert.lengthOf(memberships, 1)
    assert.equal(memberships[0]?.status, OrganizationUserStatus.APPROVED)
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

    const command = new ProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(outsider.id),
      {
        handle: (payload) => {
          notificationCalls.push(payload)
          return Promise.resolve(null)
        },
      }
    )

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      ForbiddenException
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

    const command = new ProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(pendingAdmin.id),
      {
        handle: (payload) => {
          notificationCalls.push(payload)
          return Promise.resolve(null)
        },
      }
    )

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      ForbiddenException
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
    const command = new ProcessJoinRequestCommand(
      makeSystemOrganizationActionContext(owner.id),
      {
        handle: (payload) => {
          notificationCalls.push(payload)
          return Promise.resolve(null)
        },
      }
    )

    await assert.rejects(
      () => command.execute(new ProcessJoinRequestDTO(org.id, requester.id, true)),
      NotFoundException
    )
    assert.isNull(await membershipQueries.findMembership(org.id, requester.id))
    assert.lengthOf(notificationCalls, 0)
  })
})
