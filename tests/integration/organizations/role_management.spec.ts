import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole } from '#constants/organization_constants'
import { hasOrgPermission, getOrgRoleLevel, ORG_ROLE_LEVEL } from '#constants/permissions'
import {
  canChangeRole,
  canRemoveMember,
} from '#actions/organizations/rules/org_permission_policy'

test.group('Integration | Organization Role Management', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner has highest role level', async ({ assert }) => {
    assert.equal(getOrgRoleLevel(OrganizationRole.OWNER), ORG_ROLE_LEVEL[OrganizationRole.OWNER])
    assert.isBelow(
      getOrgRoleLevel(OrganizationRole.OWNER),
      getOrgRoleLevel(OrganizationRole.ADMIN)
    )
    assert.isBelow(
      getOrgRoleLevel(OrganizationRole.ADMIN),
      getOrgRoleLevel(OrganizationRole.MEMBER)
    )
  })

  test('owner has all org permissions', async ({ assert }) => {
    const perms = [
      'can_manage_members',
      'can_approve_members',
      'can_change_roles',
      'can_create_project',
      'can_manage_settings',
      'can_manage_tasks',
      'can_view_all_data',
      'can_delete_organization',
      'can_transfer_ownership',
    ]

    for (const perm of perms) {
      assert.isTrue(
        hasOrgPermission(OrganizationRole.OWNER, perm),
        `Owner should have ${perm}`
      )
    }
  })

  test('member has limited org permissions', async ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.MEMBER, 'can_view_members'))
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_manage_members'))
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_delete_organization'))
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_transfer_ownership'))
  })

  test('canChangeRole denies member changing roles', async ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.MEMBER,
      targetOrgRole: OrganizationRole.MEMBER,
      newRole: OrganizationRole.ADMIN,
      isSelf: false,
    })

    assert.isFalse(result.allowed)
  })

  test('canChangeRole allows owner to promote member to admin', async ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetOrgRole: OrganizationRole.MEMBER,
      newRole: OrganizationRole.ADMIN,
      isSelf: false,
    })

    assert.isTrue(result.allowed)
  })

  test('canRemoveMember denies removing owner', async ({ assert }) => {
    const result = canRemoveMember({
      actorOrgRole: OrganizationRole.ADMIN,
      targetOrgRole: OrganizationRole.OWNER,
      isSelf: false,
    })

    assert.isFalse(result.allowed)
  })

  test('updateRole changes member role in database', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    await OrganizationUser.updateRole(org.id, user.id, OrganizationRole.ADMIN)

    const membership = await OrganizationUser.findMembership(org.id, user.id)
    assert.equal(membership!.org_role, OrganizationRole.ADMIN)
  })

  test('countMembers returns correct count after role changes', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.ADMIN,
    })
    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user2.id,
      org_role: OrganizationRole.MEMBER,
    })

    const count = await OrganizationUser.countMembers(org.id)
    assert.equal(count, 3) // owner + 2 members
  })
})
