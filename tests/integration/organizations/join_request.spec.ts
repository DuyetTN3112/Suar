import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, OrganizationFactory, cleanupTestData } from '#tests/helpers/factories'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import OrganizationUserRepository from '#repositories/organization_user_repository'

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

    assert.isNotNull(membership)
    assert.equal(membership.status, OrganizationUserStatus.PENDING)
    assert.equal(membership.organization_id, org.id)
    assert.equal(membership.user_id, user.id)
    assert.equal(membership.org_role, OrganizationRole.MEMBER)
  })

  test('approve flow updates membership status to approved', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await OrganizationUserRepository.updateStatus(org.id, user.id, 'approved')

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    assert.equal(membership!.org_role, OrganizationRole.MEMBER)
    assert.equal(membership!.status, OrganizationUserStatus.APPROVED)
  })

  test('reject sets membership status to rejected', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await OrganizationUserRepository.updateStatus(org.id, user.id, 'rejected')

    const membership = await OrganizationUserRepository.findMembership(org.id, user.id)
    assert.isNotNull(membership)
    assert.equal(membership!.status, OrganizationUserStatus.REJECTED)
  })

  test('pending membership is detected by hasMembership', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const hasMembership = await OrganizationUserRepository.isMember(user.id, org.id)
    assert.isTrue(hasMembership)

    // But NOT an approved member
    const isApproved = await OrganizationUserRepository.isApprovedMember(user.id, org.id)
    assert.isFalse(isApproved)
  })

  test('existing member has membership check returns true', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const isMember = await OrganizationUserRepository.isMember(owner.id, org.id)
    assert.isTrue(isMember)
  })

  test('get pending members for organization returns all pending', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })
    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user2.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const pending = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('status', OrganizationUserStatus.PENDING)
    assert.equal(pending.length, 2)
  })

  test('approved member no longer listed as pending', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    await OrganizationUserRepository.updateStatus(org.id, user.id, 'approved')

    const pendingMembers = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('status', OrganizationUserStatus.PENDING)
    // Only the original pending members; the approved one should no longer appear
    const userPending = pendingMembers.filter((m) => m.user_id === user.id)
    assert.equal(userPending.length, 0)
  })
})
