import { test } from '@japa/runner'
import {
  SYSTEM_ROLE_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  ORG_ROLE_LEVEL,
  PROJECT_ROLE_LEVEL,
  hasSystemPermission,
  hasOrgPermission,
  hasProjectPermission,
  getOrgRoleLevel,
  getProjectRoleLevel,
} from '#constants/permissions'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'

// ============================================================================
// SYSTEM_ROLE_PERMISSIONS
// ============================================================================
test.group('SYSTEM_ROLE_PERMISSIONS', () => {
  test('superadmin has wildcard permission', ({ assert }) => {
    assert.deepEqual(SYSTEM_ROLE_PERMISSIONS[SystemRoleName.SUPERADMIN], ['*'])
  })

  test('system_admin has limited permissions', ({ assert }) => {
    const perms = SYSTEM_ROLE_PERMISSIONS[SystemRoleName.SYSTEM_ADMIN]!
    assert.isTrue(perms.length > 0)
    assert.include(perms, 'can_manage_users')
    assert.notInclude(perms, '*')
  })

  test('registered_user has no system permissions', ({ assert }) => {
    assert.deepEqual(SYSTEM_ROLE_PERMISSIONS[SystemRoleName.REGISTERED_USER], [])
  })
})

// ============================================================================
// ORG_ROLE_PERMISSIONS
// ============================================================================
test.group('ORG_ROLE_PERMISSIONS', () => {
  test('owner has most permissions', ({ assert }) => {
    const ownerPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.OWNER]!
    assert.isTrue(ownerPerms.length > 0)
    assert.include(ownerPerms, 'can_delete_organization')
    assert.include(ownerPerms, 'can_transfer_ownership')
  })

  test('admin has fewer permissions than owner', ({ assert }) => {
    const ownerPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.OWNER]!
    const adminPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN]!
    assert.isTrue(adminPerms.length < ownerPerms.length)
  })

  test('admin cannot delete organization', ({ assert }) => {
    const adminPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN]!
    assert.notInclude(adminPerms, 'can_delete_organization')
  })

  test('member has limited permissions', ({ assert }) => {
    const memberPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.MEMBER]!
    assert.isTrue(memberPerms.length > 0)
    assert.notInclude(memberPerms, 'can_manage_members')
  })
})

// ============================================================================
// PROJECT_ROLE_PERMISSIONS
// ============================================================================
test.group('PROJECT_ROLE_PERMISSIONS', () => {
  test('owner has most permissions', ({ assert }) => {
    const perms = PROJECT_ROLE_PERMISSIONS[ProjectRole.OWNER]!
    assert.include(perms, 'can_delete_project')
    assert.include(perms, 'can_transfer_ownership')
  })

  test('manager cannot delete project', ({ assert }) => {
    const perms = PROJECT_ROLE_PERMISSIONS[ProjectRole.MANAGER]!
    assert.notInclude(perms, 'can_delete_project')
  })

  test('member has basic permissions', ({ assert }) => {
    const perms = PROJECT_ROLE_PERMISSIONS[ProjectRole.MEMBER]!
    assert.include(perms, 'can_view_assigned_tasks')
    assert.include(perms, 'can_update_own_tasks')
  })

  test('viewer only has view permission', ({ assert }) => {
    const perms = PROJECT_ROLE_PERMISSIONS[ProjectRole.VIEWER]!
    assert.deepEqual([...perms], ['can_view_all_tasks'])
  })
})

// ============================================================================
// Role Level Hierarchy
// ============================================================================
test.group('ORG_ROLE_LEVEL', () => {
  test('owner is level 1 (most powerful)', ({ assert }) => {
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.OWNER], 1)
  })

  test('admin is level 2', ({ assert }) => {
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.ADMIN], 2)
  })

  test('member is level 3', ({ assert }) => {
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.MEMBER], 3)
  })

  test('hierarchy: owner < admin < member (numerically)', ({ assert }) => {
    assert.isTrue(ORG_ROLE_LEVEL[OrganizationRole.OWNER]! < ORG_ROLE_LEVEL[OrganizationRole.ADMIN]!)
    assert.isTrue(
      ORG_ROLE_LEVEL[OrganizationRole.ADMIN]! < ORG_ROLE_LEVEL[OrganizationRole.MEMBER]!
    )
  })
})

test.group('PROJECT_ROLE_LEVEL', () => {
  test('owner is level 1', ({ assert }) => {
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.OWNER], 1)
  })

  test('manager is level 2', ({ assert }) => {
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.MANAGER], 2)
  })

  test('member is level 3', ({ assert }) => {
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.MEMBER], 3)
  })

  test('viewer is level 4', ({ assert }) => {
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.VIEWER], 4)
  })
})

// ============================================================================
// hasSystemPermission
// ============================================================================
test.group('hasSystemPermission', () => {
  test('superadmin has any permission (wildcard)', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'anything'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'can_manage_users'))
  })

  test('system_admin has specific permissions', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_manage_users'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_view_reports'))
  })

  test('system_admin lacks certain permissions', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_do_anything'))
  })

  test('registered_user has no system permissions', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_manage_users'))
  })

  test('returns false for unknown role', ({ assert }) => {
    assert.isFalse(hasSystemPermission('unknown_role', 'can_manage_users'))
  })
})

// ============================================================================
// hasOrgPermission
// ============================================================================
test.group('hasOrgPermission', () => {
  test('owner has create project permission', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_create_project'))
  })

  test('admin has create project permission', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.ADMIN, 'can_create_project'))
  })

  test('member cannot create project', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_create_project'))
  })

  test('returns false for unknown role', ({ assert }) => {
    assert.isFalse(hasOrgPermission('unknown', 'can_create_project'))
  })
})

// ============================================================================
// hasProjectPermission
// ============================================================================
test.group('hasProjectPermission', () => {
  test('owner has delete project permission', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_delete_project'))
  })

  test('manager cannot delete project', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MANAGER, 'can_delete_project'))
  })

  test('viewer only has view permission', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.VIEWER, 'can_view_all_tasks'))
    assert.isFalse(hasProjectPermission(ProjectRole.VIEWER, 'can_create_task'))
  })

  test('returns false for unknown role', ({ assert }) => {
    assert.isFalse(hasProjectPermission('unknown', 'can_view_all_tasks'))
  })
})

// ============================================================================
// getOrgRoleLevel / getProjectRoleLevel
// ============================================================================
test.group('getOrgRoleLevel', () => {
  test('returns correct level for known roles', ({ assert }) => {
    assert.equal(getOrgRoleLevel(OrganizationRole.OWNER), 1)
    assert.equal(getOrgRoleLevel(OrganizationRole.ADMIN), 2)
    assert.equal(getOrgRoleLevel(OrganizationRole.MEMBER), 3)
  })

  test('returns 0 for unknown role', ({ assert }) => {
    assert.equal(getOrgRoleLevel('unknown'), 0)
  })
})

test.group('getProjectRoleLevel', () => {
  test('returns correct level for known roles', ({ assert }) => {
    assert.equal(getProjectRoleLevel(ProjectRole.OWNER), 1)
    assert.equal(getProjectRoleLevel(ProjectRole.MANAGER), 2)
    assert.equal(getProjectRoleLevel(ProjectRole.MEMBER), 3)
    assert.equal(getProjectRoleLevel(ProjectRole.VIEWER), 4)
  })

  test('returns 0 for unknown role', ({ assert }) => {
    assert.equal(getProjectRoleLevel('unknown'), 0)
  })
})
