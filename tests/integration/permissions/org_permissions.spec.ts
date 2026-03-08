import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { OrganizationRole } from '#constants/organization_constants'
import {
  canTransferOwnership,
  canRemoveMember,
  canDeleteOrganization,
  canChangeRole,
  canAddMember,
  canProcessJoinRequest,
} from '#actions/organizations/rules/org_permission_policy'
import {
  hasOrgPermission,
  hasSystemPermission,
  hasProjectPermission,
  getOrgRoleLevel,
  getProjectRoleLevel,
  ORG_ROLE_LEVEL,
  PROJECT_ROLE_LEVEL,
} from '#constants/permissions'

test.group('Integration | Organization Permissions', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('only owner can transfer ownership', async ({ assert }) => {
    const allowed = canTransferOwnership({
      actorOrgRole: OrganizationRole.OWNER,
      newOwnerOrgRole: OrganizationRole.ADMIN,
      isSelf: false,
    })
    assert.isTrue(allowed.allowed)

    const denied = canTransferOwnership({
      actorOrgRole: OrganizationRole.ADMIN,
      newOwnerOrgRole: OrganizationRole.MEMBER,
      isSelf: false,
    })
    assert.isFalse(denied.allowed)
  })

  test('cannot remove org owner', async ({ assert }) => {
    const result = canRemoveMember({
      actorOrgRole: OrganizationRole.ADMIN,
      targetOrgRole: OrganizationRole.OWNER,
      isSelf: false,
    })
    assert.isFalse(result.allowed)
  })

  test('admin can remove member', async ({ assert }) => {
    const result = canRemoveMember({
      actorOrgRole: OrganizationRole.ADMIN,
      targetOrgRole: OrganizationRole.MEMBER,
      isSelf: false,
    })
    assert.isTrue(result.allowed)
  })

  test('member cannot remove other member', async ({ assert }) => {
    const result = canRemoveMember({
      actorOrgRole: OrganizationRole.MEMBER,
      targetOrgRole: OrganizationRole.MEMBER,
      isSelf: false,
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
    assert.isBelow(getOrgRoleLevel(OrganizationRole.ADMIN), getOrgRoleLevel(OrganizationRole.MEMBER))
    assert.equal(getOrgRoleLevel('unknown_role'), 0)
  })
})
