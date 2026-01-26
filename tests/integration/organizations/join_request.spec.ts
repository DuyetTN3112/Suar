import { test } from '@japa/runner'

import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import OrganizationUser from '#infra/organizations/models/organization_user'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
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

    const membership = await OrganizationUserRepository.addMember({
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

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await OrganizationUserRepository.updateStatus(org.id, user.id, OrganizationUserStatus.APPROVED)

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
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

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await OrganizationUserRepository.updateStatus(org.id, user.id, OrganizationUserStatus.REJECTED)

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }
    assert.equal(membership.status, OrganizationUserStatus.REJECTED)
    assert.isTrue(await OrganizationUserRepository.isMember(user.id, org.id))
  })

  test('pending membership counts as membership but not approved membership', async ({
    assert,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    assert.isTrue(await OrganizationUserRepository.isMember(user.id, org.id))
    assert.isFalse(await OrganizationUserRepository.isApprovedMember(user.id, org.id))
  })
})
