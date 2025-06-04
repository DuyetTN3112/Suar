import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import OrganizationJoinRequest from '#models/organization_join_request'
import OrganizationUser from '#models/organization_user'
import { OrganizationUserStatus } from '#constants/organization_constants'

test.group('Integration | Organization Join Request', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('user creates join request with pending status', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    const request = await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user.id,
      message: 'I want to join this organization',
    })

    assert.isNotNull(request)
    assert.equal(request.status, OrganizationUserStatus.PENDING)
    assert.equal(request.organization_id, org.id)
    assert.equal(request.user_id, user.id)
  })

  test('approve flow creates membership with org_member role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    const request = await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user.id,
      message: 'Please let me join',
    })

    await OrganizationJoinRequest.updateStatus(request.id, {
      status: OrganizationUserStatus.APPROVED,
      processed_by: owner.id,
    })

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: 'org_member',
      status: OrganizationUserStatus.APPROVED,
    })

    const membership = await OrganizationUser.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    assert.equal(membership!.org_role, 'org_member')
    assert.equal(membership!.status, OrganizationUserStatus.APPROVED)
  })

  test('reject sets request status to rejected', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    const request = await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user.id,
      message: 'Please add me',
    })

    await OrganizationJoinRequest.updateStatus(request.id, {
      status: OrganizationUserStatus.REJECTED,
      processed_by: owner.id,
    })

    const updated = await OrganizationJoinRequest.findByIdOrFail(request.id)
    assert.equal(updated.status, OrganizationUserStatus.REJECTED)
  })

  test('hasPendingRequest returns true for pending request', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user.id,
      message: 'First request',
    })

    const hasPending = await OrganizationJoinRequest.hasPendingRequest(org.id, user.id)
    assert.isTrue(hasPending)
  })

  test('existing member has membership check returns true', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const isMember = await OrganizationUser.hasMembership(org.id, owner.id)
    assert.isTrue(isMember)
  })

  test('get pending requests for organization returns all pending', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user1.id,
      message: 'Request 1',
    })
    await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user2.id,
      message: 'Request 2',
    })

    const pending = await OrganizationJoinRequest.getPendingByOrganization(org.id)
    assert.equal(pending.length, 2)
  })

  test('approved request no longer listed as pending', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    const request = await OrganizationJoinRequest.createRequest({
      organization_id: org.id,
      user_id: user.id,
      message: 'Join me',
    })

    await OrganizationJoinRequest.updateStatus(request.id, {
      status: OrganizationUserStatus.APPROVED,
      processed_by: owner.id,
    })

    const hasPending = await OrganizationJoinRequest.hasPendingRequest(org.id, user.id)
    assert.isFalse(hasPending)
  })
})
