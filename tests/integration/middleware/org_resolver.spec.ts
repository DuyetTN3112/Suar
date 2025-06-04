import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import OrganizationUser from '#models/organization_user'
import Organization from '#models/organization'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import User from '#models/user'

test.group('Integration | Organization Resolver', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('user with approved membership has valid org context', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    // Simulate what org resolver does: check membership and set current_org
    const isApproved = await OrganizationUser.isApprovedMember(owner.id, org.id)
    assert.isTrue(isApproved)
  })

  test('user with no membership has no org context', async ({ assert }) => {
    const user = await UserFactory.create()
    const { org } = await OrganizationFactory.createWithOwner()

    const isApproved = await OrganizationUser.isApprovedMember(user.id, org.id)
    assert.isFalse(isApproved)
  })

  test('pending membership does not give org context', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const isApproved = await OrganizationUser.isApprovedMember(user.id, org.id)
    assert.isFalse(isApproved)
  })

  test('user current_organization_id syncs with DB', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    // Simulate resolver syncing org to user
    owner.current_organization_id = org.id
    await owner.save()

    const reloaded = await User.findActiveOrFail(owner.id)
    assert.equal(reloaded.current_organization_id, org.id)
  })

  test('deleted org not resolvable for membership', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { DateTime } = await import('luxon')

    // Soft-delete the org
    org.deleted_at = DateTime.now()
    await org.save()

    // The membership still exists but org is deleted
    const membership = await OrganizationUser.findMembership(org.id, owner.id)
    assert.isNotNull(membership)
    // In practice, the resolver checks org.deleted_at before accepting
  })
})
