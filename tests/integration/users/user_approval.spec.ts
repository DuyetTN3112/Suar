import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, OrganizationFactory, cleanupTestData } from '#tests/helpers/factories'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import { UserStatusName } from '#constants/user_constants'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'

test.group('Integration | User Approval', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('pending member keeps pending semantics until approval', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    if (membership === null) {
      return
    }

    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.isTrue(membership.isPending())
    assert.isFalse(membership.isApproved())
    assert.isFalse(await OrganizationUserRepository.isApprovedMember(user.id, org.id))
  })

  test('approve user changes status to approved', async ({ assert }) => {
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

    assert.isTrue(membership.isApproved())
    assert.isTrue(await OrganizationUserRepository.isApprovedMember(user.id, org.id))
  })

  test('user repository distinguishes active and inactive users', async ({ assert }) => {
    const activeUser = await UserFactory.create({ status: UserStatusName.ACTIVE })
    const inactiveUser = await UserFactory.create({ status: UserStatusName.INACTIVE })

    assert.isTrue(await UserRepository.isActive(activeUser.id))
    assert.isFalse(await UserRepository.isActive(inactiveUser.id))
  })

  test('superadmin check returns true for superadmin role', async ({ assert }) => {
    const user = await UserFactory.createSuperadmin()
    const isSuperadmin = await UserRepository.isSuperadmin(user.id)
    assert.isTrue(isSuperadmin)
  })

  test('validateAllApprovedMembers checks all users', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user2.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const allApproved = await OrganizationUserRepository.validateAllApprovedMembers(
      [user1.id, user2.id],
      org.id
    )
    assert.isTrue(allApproved)
  })
})
