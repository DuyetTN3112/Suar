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

  test('pending user has pending status in org membership', async ({ assert }) => {
    const { org, owner: _owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
    assert.equal(membership!.status, OrganizationUserStatus.PENDING)
    assert.isTrue(membership!.isPending())
    assert.isFalse(membership!.isApproved())
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
    assert.isTrue(membership!.isApproved())
  })

  test('isApprovedMember returns false for pending user', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const isApproved = await OrganizationUserRepository.isApprovedMember(user.id, org.id)
    assert.isFalse(isApproved)
  })

  test('isApprovedMember returns true after approval', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const isApproved = await OrganizationUserRepository.isApprovedMember(user.id, org.id)
    assert.isTrue(isApproved)
  })

  test('user isActive check', async ({ assert }) => {
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })
    const isActive = await UserRepository.isActive(user.id)
    assert.isTrue(isActive)
  })

  test('inactive user fails isActive check', async ({ assert }) => {
    const user = await UserFactory.create({ status: UserStatusName.INACTIVE })
    const isActive = await UserRepository.isActive(user.id)
    assert.isFalse(isActive)
  })

  test('superadmin check returns true for superadmin role', async ({ assert }) => {
    const user = await UserFactory.createSuperadmin()
    const isSuperadmin = await UserRepository.isSuperadmin(user.id)
    assert.isTrue(isSuperadmin)
  })

  test('validateAllApprovedMembers checks all users', async ({ assert }) => {
    const { org, owner: _owner } = await OrganizationFactory.createWithOwner()
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
