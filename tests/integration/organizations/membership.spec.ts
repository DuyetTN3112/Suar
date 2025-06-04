import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole } from '#constants/organization_constants'

test.group('Integration | Organization Membership', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add member successfully', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const newMember = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newMember.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const membership = await OrganizationUser.findMembership(org.id, newMember.id)
    assert.isNotNull(membership)
    assert.equal(membership!.org_role, 'org_member')
  })

  test('duplicate member throws', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const existing = await OrganizationUser.hasMembership(org.id, member.id)
    assert.isTrue(existing)
  })

  test('remove member successfully', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    await OrganizationUser.deleteMember(org.id, member.id)

    const membership = await OrganizationUser.findMembership(org.id, member.id)
    assert.isNull(membership)
  })

  test('update role successfully', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    await OrganizationUser.updateRole(org.id, member.id, 'org_admin')

    const membership = await OrganizationUser.findMembership(org.id, member.id)
    assert.equal(membership!.org_role, 'org_admin')
  })

  test('invite creates pending membership', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: invitee.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const membership = await OrganizationUser.findMembership(org.id, invitee.id)
    assert.isNotNull(membership)
    assert.equal(membership!.status, 'pending')
  })

  test('member count correct after add/remove', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const member1 = await UserFactory.create()
    const member2 = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member1.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member2.id,
      org_role: 'org_member',
      status: 'approved',
    })

    let count = await OrganizationUser.countMembers(org.id)
    assert.equal(Number(count), 3) // owner + 2 members

    await OrganizationUser.deleteMember(org.id, member2.id)
    count = await OrganizationUser.countMembers(org.id)
    assert.equal(Number(count), 2)
  })

  test('role hierarchy: owner > admin > member', async ({ assert }) => {
    const roles = Object.values(OrganizationRole)
    assert.include(roles, 'org_owner')
    assert.include(roles, 'org_admin')
    assert.include(roles, 'org_member')
  })

  test('admin can add members', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const isAdmin = await OrganizationUser.isOrgAdminOrOwner(admin.id, org.id)
    assert.isTrue(isAdmin)
  })

  test('isApprovedMember returns true for active member', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const isApproved = await OrganizationUser.isApprovedMember(member.id, org.id)
    assert.isTrue(isApproved)
  })

  test('isApprovedMember returns false for pending member', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const pending = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pending.id,
      org_role: 'org_member',
      status: 'pending',
    })

    const isApproved = await OrganizationUser.isApprovedMember(pending.id, org.id)
    assert.isFalse(isApproved)
  })

  test('isOrgAdminOrOwner returns true for owner', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const isAdmin = await OrganizationUser.isOrgAdminOrOwner(owner.id, org.id)
    assert.isTrue(isAdmin)
  })

  test('isOrgAdminOrOwner returns false for regular member', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const isAdmin = await OrganizationUser.isOrgAdminOrOwner(member.id, org.id)
    assert.isFalse(isAdmin)
  })
})
