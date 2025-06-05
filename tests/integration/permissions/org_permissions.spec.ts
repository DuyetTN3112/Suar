import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { OrganizationRole } from '#constants/organization_constants'
import {
  canTransferOwnership,
  canRemoveMember,
  canProcessJoinRequest,
} from '#domain/organizations/org_permission_policy'
import { hasSystemPermission, getOrgRoleLevel } from '#constants/permissions'

test.group('Integration | Organization Permissions', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('only owner can transfer ownership', async ({ assert }) => {
    const allowed = canTransferOwnership({
      actorId: 'actor-1',
      currentOwnerId: 'actor-1',
      newOwnerId: 'target-1',
      newOwnerRole: OrganizationRole.ADMIN,
      isNewOwnerApprovedMember: true,
    })
    assert.isTrue(allowed.allowed)

    const denied = canTransferOwnership({
      actorId: 'actor-2',
      currentOwnerId: 'actor-1',
      newOwnerId: 'target-2',
      newOwnerRole: OrganizationRole.MEMBER,
      isNewOwnerApprovedMember: true,
    })
    assert.isFalse(denied.allowed)
  })

  test('cannot remove org owner', async ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'admin-1',
      actorOrgRole: OrganizationRole.ADMIN,
      targetUserId: 'owner-1',
      targetOrgRole: OrganizationRole.OWNER,
    })
    assert.isFalse(result.allowed)
  })

  test('admin can remove member', async ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'admin-1',
      actorOrgRole: OrganizationRole.ADMIN,
      targetUserId: 'member-1',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isTrue(result.allowed)
  })

  test('member cannot remove other member', async ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'member-1',
      actorOrgRole: OrganizationRole.MEMBER,
      targetUserId: 'member-2',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isFalse(result.allowed)
  })

  test('canProcessJoinRequest requires admin or owner role', async ({ assert }) => {
    const allowedOwner = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.OWNER,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isTrue(allowedOwner.allowed)

    const deniedMember = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.MEMBER,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isFalse(deniedMember.allowed)
  })

  test('superadmin has all system permissions via wildcard', async ({ assert }) => {
    assert.isTrue(hasSystemPermission('superadmin', 'can_manage_users'))
    assert.isTrue(hasSystemPermission('superadmin', 'can_delete_anything'))
    assert.isTrue(hasSystemPermission('superadmin', 'any_random_permission'))
  })

  test('role levels order correctly', async ({ assert }) => {
    assert.isBelow(getOrgRoleLevel(OrganizationRole.OWNER), getOrgRoleLevel(OrganizationRole.ADMIN))
    assert.isBelow(
      getOrgRoleLevel(OrganizationRole.ADMIN),
      getOrgRoleLevel(OrganizationRole.MEMBER)
    )
    assert.equal(getOrgRoleLevel('unknown_role'), 0)
  })
})
