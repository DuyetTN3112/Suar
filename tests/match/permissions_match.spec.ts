import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'
import {
  SYSTEM_ROLE_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  ORG_ROLE_LEVEL,
  PROJECT_ROLE_LEVEL,
  hasSystemPermission,
} from '#constants/permissions'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Match Tests: Permission Constants Consistency
 *
 * Ensures that all role-permission mappings are consistent:
 * - Every enum role value has a corresponding permission entry
 * - Role levels are monotonically ordered
 * - No orphaned permission definitions
 */

test.group('Match | Permission System Consistency', () => {
  test('every SystemRoleName has a permission entry', ({ assert }) => {
    for (const role of Object.values(SystemRoleName)) {
      assert.isDefined(
        SYSTEM_ROLE_PERMISSIONS[role],
        `Missing SYSTEM_ROLE_PERMISSIONS entry for: ${role}`
      )
    }
  })

  test('every OrganizationRole has a permission entry', ({ assert }) => {
    for (const role of Object.values(OrganizationRole)) {
      assert.isDefined(
        ORG_ROLE_PERMISSIONS[role],
        `Missing ORG_ROLE_PERMISSIONS entry for: ${role}`
      )
    }
  })

  test('every ProjectRole has a permission entry', ({ assert }) => {
    for (const role of Object.values(ProjectRole)) {
      assert.isDefined(
        PROJECT_ROLE_PERMISSIONS[role],
        `Missing PROJECT_ROLE_PERMISSIONS entry for: ${role}`
      )
    }
  })

  test('every OrganizationRole has a role level', ({ assert }) => {
    for (const role of Object.values(OrganizationRole)) {
      assert.isDefined(ORG_ROLE_LEVEL[role], `Missing ORG_ROLE_LEVEL entry for: ${role}`)
    }
  })

  test('every ProjectRole has a role level', ({ assert }) => {
    for (const role of Object.values(ProjectRole)) {
      assert.isDefined(PROJECT_ROLE_LEVEL[role], `Missing PROJECT_ROLE_LEVEL entry for: ${role}`)
    }
  })

  test('superadmin wildcard grants any permission', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'can_do_anything'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'nonexistent_perm'))
  })

  test('registered_user has no system permissions', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_manage_users'))
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_approve_members'))
  })

  test('org owner has more permissions than admin', ({ assert }) => {
    const ownerPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.OWNER] ?? []
    const adminPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN] ?? []
    assert.isAbove(ownerPerms.length, adminPerms.length)
  })

  test('project owner has more permissions than manager', ({ assert }) => {
    const ownerPerms = PROJECT_ROLE_PERMISSIONS[ProjectRole.OWNER] ?? []
    const managerPerms = PROJECT_ROLE_PERMISSIONS[ProjectRole.MANAGER] ?? []
    assert.isAbove(ownerPerms.length, managerPerms.length)
  })

  test('org role levels are strictly ordered', ({ assert }) => {
    const ownerLevel = ORG_ROLE_LEVEL[OrganizationRole.OWNER] ?? 0
    const adminLevel = ORG_ROLE_LEVEL[OrganizationRole.ADMIN] ?? 0
    const memberLevel = ORG_ROLE_LEVEL[OrganizationRole.MEMBER] ?? 0
    assert.isBelow(ownerLevel, adminLevel)
    assert.isBelow(adminLevel, memberLevel)
  })

  test('project role levels are strictly ordered', ({ assert }) => {
    const ownerLevel = PROJECT_ROLE_LEVEL[ProjectRole.OWNER] ?? 0
    const managerLevel = PROJECT_ROLE_LEVEL[ProjectRole.MANAGER] ?? 0
    const memberLevel = PROJECT_ROLE_LEVEL[ProjectRole.MEMBER] ?? 0
    const viewerLevel = PROJECT_ROLE_LEVEL[ProjectRole.VIEWER] ?? 0
    assert.isBelow(ownerLevel, managerLevel)
    assert.isBelow(managerLevel, memberLevel)
    assert.isBelow(memberLevel, viewerLevel)
  })
})

test.group('Match | Frontend Permission Constants', () => {
  test('frontend role constants file exists and has org roles', ({ assert }) => {
    // Check if frontend has matching role definitions
    const possiblePaths = [
      'inertia/types/index.ts',
      'inertia/types/roles.ts',
      'inertia/pages/organizations/types/index.ts',
    ]

    let foundOrgRoles = false
    for (const p of possiblePaths) {
      const fullPath = path.join(WORKSPACE_ROOT, p)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (content.includes('org_owner') || content.includes('org_role')) {
          foundOrgRoles = true
          break
        }
      }
    }
    assert.isTrue(foundOrgRoles, 'Frontend should define org role types')
  })
})
