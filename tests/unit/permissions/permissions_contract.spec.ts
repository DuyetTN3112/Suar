import { readFileSync } from 'node:fs'

import { test } from '@japa/runner'

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
} from '#modules/authorization/constants/permissions'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import { SystemRoleName } from '#modules/users/constants/user_constants'

const SQL_SCHEMA_PATH = new URL('../../../docs/db/suar.sql', import.meta.url)

function readSqlPermissionArray(role: string): string[] {
  const sql = readFileSync(SQL_SCHEMA_PATH, 'utf8')
  const match = new RegExp(`WHEN '${role}' THEN '(\\[[^']*\\])'::JSONB`).exec(sql)
  if (!match) {
    throw new Error(`Missing SQL permission array for ${role}`)
  }
  const permissionJson = match[1]
  if (!permissionJson) {
    throw new Error(`Missing SQL permission payload for ${role}`)
  }
  return JSON.parse(permissionJson) as string[]
}

function diffPermissions(left: readonly string[], right: readonly string[]): string[] {
  return left.filter((permission) => !right.includes(permission)).sort()
}

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

  test('SQL permission arrays match TypeScript permission maps', ({ assert }) => {
    for (const role of [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER]) {
      const sqlPermissions = readSqlPermissionArray(role)
      const tsPermissions = ORG_ROLE_PERMISSIONS[role] ?? []

      assert.deepEqual(diffPermissions(sqlPermissions, tsPermissions), [])
      assert.deepEqual(diffPermissions(tsPermissions, sqlPermissions), [])
    }

    for (const role of [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.MEMBER,
      ProjectRole.VIEWER,
    ]) {
      const sqlPermissions = readSqlPermissionArray(role)
      const tsPermissions = PROJECT_ROLE_PERMISSIONS[role] ?? []

      assert.deepEqual(diffPermissions(sqlPermissions, tsPermissions), [])
      assert.deepEqual(diffPermissions(tsPermissions, sqlPermissions), [])
    }
  })
})
