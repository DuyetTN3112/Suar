import { test } from '@japa/runner'

import { OrganizationRole } from '#constants/organization_constants'
import {
  ORG_ROLE_LEVEL,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_LEVEL,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  getOrgRoleLevel,
  getProjectRoleLevel,
  hasOrgPermission,
  hasProjectPermission,
  hasSystemPermission,
} from '#constants/permissions'
import { ProjectRole } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'

test.group('Permission contracts', () => {
  test('permission maps and role levels cover every builtin role while least-privilege stays intentionally narrow', ({
    assert,
  }) => {
    for (const role of Object.values(SystemRoleName)) {
      assert.property(SYSTEM_ROLE_PERMISSIONS, role)
    }
    for (const role of Object.values(OrganizationRole)) {
      assert.property(ORG_ROLE_PERMISSIONS, role)
      assert.property(ORG_ROLE_LEVEL, role)
    }
    for (const role of Object.values(ProjectRole)) {
      assert.property(PROJECT_ROLE_PERMISSIONS, role)
      assert.property(PROJECT_ROLE_LEVEL, role)
    }

    assert.lengthOf(SYSTEM_ROLE_PERMISSIONS[SystemRoleName.REGISTERED_USER] ?? [], 0)
    assert.isAtMost((ORG_ROLE_PERMISSIONS[OrganizationRole.MEMBER] ?? []).length, 5)
    assert.lengthOf(PROJECT_ROLE_PERMISSIONS[ProjectRole.VIEWER] ?? [], 1)
  })

  test('system and organization helpers preserve privilege hierarchy and denial semantics', ({
    assert,
  }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'can_do_anything'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_manage_users'))
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_manage_users'))
    assert.isFalse(hasSystemPermission('unknown_role', 'can_manage_users'))

    assert.isBelow(getOrgRoleLevel(OrganizationRole.OWNER), getOrgRoleLevel(OrganizationRole.ADMIN))
    assert.isBelow(
      getOrgRoleLevel(OrganizationRole.ADMIN),
      getOrgRoleLevel(OrganizationRole.MEMBER)
    )
    assert.isTrue(hasOrgPermission(OrganizationRole.ADMIN, 'can_manage_members'))
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_manage_members'))
  })

  test('project helpers preserve owner > manager > member > viewer semantics', ({ assert }) => {
    assert.isBelow(getProjectRoleLevel(ProjectRole.OWNER), getProjectRoleLevel(ProjectRole.MANAGER))
    assert.isBelow(
      getProjectRoleLevel(ProjectRole.MANAGER),
      getProjectRoleLevel(ProjectRole.MEMBER)
    )
    assert.isBelow(getProjectRoleLevel(ProjectRole.MEMBER), getProjectRoleLevel(ProjectRole.VIEWER))
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_delete_project'))
    assert.isTrue(hasProjectPermission(ProjectRole.MANAGER, 'can_assign_task'))
    assert.isFalse(hasProjectPermission(ProjectRole.MEMBER, 'can_assign_task'))
    assert.isTrue(hasProjectPermission(ProjectRole.VIEWER, 'can_view_all_tasks'))
    assert.isFalse(hasProjectPermission(ProjectRole.VIEWER, 'can_create_task'))
  })
})
