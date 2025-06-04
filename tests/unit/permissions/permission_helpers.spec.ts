import { test } from '@japa/runner'
import {
  hasSystemPermission,
  hasOrgPermission,
  hasProjectPermission,
  getOrgRoleLevel,
  getProjectRoleLevel,
  SYSTEM_ROLE_PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  ORG_ROLE_LEVEL,
  PROJECT_ROLE_LEVEL,
} from '#constants/permissions'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'

// ============================================================================
// Permission Maps — Structural Integrity
// ============================================================================
test.group('Permission Maps | Structural Integrity', () => {
  test('SYSTEM_ROLE_PERMISSIONS covers all SystemRoleName values', ({ assert }) => {
    for (const role of Object.values(SystemRoleName)) {
      assert.property(
        SYSTEM_ROLE_PERMISSIONS,
        role,
        `Missing permission map for system role: ${role}`
      )
    }
  })

  test('ORG_ROLE_PERMISSIONS covers all OrganizationRole values', ({ assert }) => {
    for (const role of Object.values(OrganizationRole)) {
      assert.property(ORG_ROLE_PERMISSIONS, role, `Missing permission map for org role: ${role}`)
    }
  })

  test('PROJECT_ROLE_PERMISSIONS covers all ProjectRole values', ({ assert }) => {
    for (const role of Object.values(ProjectRole)) {
      assert.property(
        PROJECT_ROLE_PERMISSIONS,
        role,
        `Missing permission map for project role: ${role}`
      )
    }
  })

  test('ORG_ROLE_LEVEL covers all OrganizationRole values', ({ assert }) => {
    for (const role of Object.values(OrganizationRole)) {
      assert.property(ORG_ROLE_LEVEL, role, `Missing role level for org role: ${role}`)
    }
  })

  test('PROJECT_ROLE_LEVEL covers all ProjectRole values', ({ assert }) => {
    for (const role of Object.values(ProjectRole)) {
      assert.property(PROJECT_ROLE_LEVEL, role, `Missing role level for project role: ${role}`)
    }
  })

  test('superadmin has wildcard permission', ({ assert }) => {
    const perms = SYSTEM_ROLE_PERMISSIONS[SystemRoleName.SUPERADMIN]
    assert.include(perms as unknown as string[], '*')
  })

  test('registered_user has no system permissions', ({ assert }) => {
    const perms = SYSTEM_ROLE_PERMISSIONS[SystemRoleName.REGISTERED_USER]
    assert.lengthOf(perms, 0)
  })

  test('system_admin has exactly 5 permissions', ({ assert }) => {
    const perms = SYSTEM_ROLE_PERMISSIONS[SystemRoleName.SYSTEM_ADMIN]
    assert.lengthOf(perms, 5)
  })

  test('org_owner has more permissions than org_admin', ({ assert }) => {
    const ownerPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.OWNER]
    const adminPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN]
    assert.isAbove(ownerPerms.length, adminPerms.length)
  })

  test('org_admin has more permissions than org_member', ({ assert }) => {
    const adminPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN]
    const memberPerms = ORG_ROLE_PERMISSIONS[OrganizationRole.MEMBER]
    assert.isAbove(adminPerms.length, memberPerms.length)
  })

  test('project_owner has more permissions than project_manager', ({ assert }) => {
    const ownerPerms = PROJECT_ROLE_PERMISSIONS[ProjectRole.OWNER]
    const managerPerms = PROJECT_ROLE_PERMISSIONS[ProjectRole.MANAGER]
    assert.isAbove(ownerPerms.length, managerPerms.length)
  })

  test('project_viewer has exactly 1 permission', ({ assert }) => {
    const viewerPerms = PROJECT_ROLE_PERMISSIONS[ProjectRole.VIEWER]
    assert.lengthOf(viewerPerms, 1)
    assert.include(viewerPerms as unknown as string[], 'can_view_all_tasks')
  })
})

// ============================================================================
// hasSystemPermission — Superadmin Wildcard
// ============================================================================
test.group('hasSystemPermission | Superadmin', () => {
  test('superadmin has any arbitrary permission', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'can_manage_users'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'any_random_permission'))
    assert.isTrue(hasSystemPermission(SystemRoleName.SUPERADMIN, 'can_delete_everything'))
  })
})

// ============================================================================
// hasSystemPermission — System Admin
// ============================================================================
test.group('hasSystemPermission | System Admin', () => {
  test('system_admin has can_manage_users', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_manage_users'))
  })

  test('system_admin has can_view_all_organizations', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_view_all_organizations'))
  })

  test('system_admin has can_view_system_logs', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_view_system_logs'))
  })

  test('system_admin has can_view_reports', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_view_reports'))
  })

  test('system_admin has can_manage_system_settings', ({ assert }) => {
    assert.isTrue(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_manage_system_settings'))
  })

  test('system_admin does NOT have can_delete_organization', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_delete_organization'))
  })

  test('system_admin does NOT have arbitrary permissions', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.SYSTEM_ADMIN, 'can_fly'))
  })
})

// ============================================================================
// hasSystemPermission — Registered User
// ============================================================================
test.group('hasSystemPermission | Registered User', () => {
  test('registered_user has no system permissions', ({ assert }) => {
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_manage_users'))
    assert.isFalse(hasSystemPermission(SystemRoleName.REGISTERED_USER, 'can_view_system_logs'))
  })
})

// ============================================================================
// hasSystemPermission — Edge Cases
// ============================================================================
test.group('hasSystemPermission | Edge Cases', () => {
  test('unknown role returns false', ({ assert }) => {
    assert.isFalse(hasSystemPermission('nonexistent_role', 'can_manage_users'))
  })

  test('empty string role returns false', ({ assert }) => {
    assert.isFalse(hasSystemPermission('', 'can_manage_users'))
  })
})

// ============================================================================
// hasOrgPermission — Owner
// ============================================================================
test.group('hasOrgPermission | Owner', () => {
  test('org_owner has can_create_project', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_create_project'))
  })

  test('org_owner has can_delete_organization', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_delete_organization'))
  })

  test('org_owner has can_transfer_ownership', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_transfer_ownership'))
  })

  test('org_owner has can_manage_billing', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_manage_billing'))
  })

  test('org_owner has can_create_custom_roles', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_create_custom_roles'))
  })

  test('org_owner has can_manage_integrations', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.OWNER, 'can_manage_integrations'))
  })
})

// ============================================================================
// hasOrgPermission — Admin
// ============================================================================
test.group('hasOrgPermission | Admin', () => {
  test('org_admin has can_create_project', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.ADMIN, 'can_create_project'))
  })

  test('org_admin has can_manage_members', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.ADMIN, 'can_manage_members'))
  })

  test('org_admin has can_invite_members', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.ADMIN, 'can_invite_members'))
  })

  test('org_admin does NOT have can_delete_organization', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.ADMIN, 'can_delete_organization'))
  })

  test('org_admin does NOT have can_transfer_ownership', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.ADMIN, 'can_transfer_ownership'))
  })

  test('org_admin does NOT have can_manage_billing', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.ADMIN, 'can_manage_billing'))
  })

  test('org_admin does NOT have can_create_custom_roles', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.ADMIN, 'can_create_custom_roles'))
  })

  test('org_admin does NOT have can_manage_integrations', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.ADMIN, 'can_manage_integrations'))
  })
})

// ============================================================================
// hasOrgPermission — Member
// ============================================================================
test.group('hasOrgPermission | Member', () => {
  test('org_member has can_view_assigned_projects', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.MEMBER, 'can_view_assigned_projects'))
  })

  test('org_member has can_update_own_tasks', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.MEMBER, 'can_update_own_tasks'))
  })

  test('org_member has can_view_organization_info', ({ assert }) => {
    assert.isTrue(hasOrgPermission(OrganizationRole.MEMBER, 'can_view_organization_info'))
  })

  test('org_member does NOT have can_create_project', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_create_project'))
  })

  test('org_member does NOT have can_manage_members', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_manage_members'))
  })

  test('org_member does NOT have can_delete_organization', ({ assert }) => {
    assert.isFalse(hasOrgPermission(OrganizationRole.MEMBER, 'can_delete_organization'))
  })
})

// ============================================================================
// hasOrgPermission — Edge Cases
// ============================================================================
test.group('hasOrgPermission | Edge Cases', () => {
  test('unknown org role returns false', ({ assert }) => {
    assert.isFalse(hasOrgPermission('nonexistent', 'can_create_project'))
  })
})

// ============================================================================
// hasProjectPermission — Owner
// ============================================================================
test.group('hasProjectPermission | Owner', () => {
  test('project_owner has can_delete_project', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_delete_project'))
  })

  test('project_owner has can_transfer_ownership', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_transfer_ownership'))
  })

  test('project_owner has can_manage_project_budget', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_manage_project_budget'))
  })

  test('project_owner has can_export_project_data', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.OWNER, 'can_export_project_data'))
  })
})

// ============================================================================
// hasProjectPermission — Manager
// ============================================================================
test.group('hasProjectPermission | Manager', () => {
  test('project_manager has can_create_task', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MANAGER, 'can_create_task'))
  })

  test('project_manager has can_assign_task', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MANAGER, 'can_assign_task'))
  })

  test('project_manager has can_approve_application', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MANAGER, 'can_approve_application'))
  })

  test('project_manager has can_review_completed_tasks', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MANAGER, 'can_review_completed_tasks'))
  })

  test('project_manager does NOT have can_delete_project', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MANAGER, 'can_delete_project'))
  })

  test('project_manager does NOT have can_transfer_ownership', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MANAGER, 'can_transfer_ownership'))
  })

  test('project_manager does NOT have can_manage_project_budget', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MANAGER, 'can_manage_project_budget'))
  })
})

// ============================================================================
// hasProjectPermission — Member
// ============================================================================
test.group('hasProjectPermission | Member', () => {
  test('project_member has can_view_assigned_tasks', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MEMBER, 'can_view_assigned_tasks'))
  })

  test('project_member has can_update_own_tasks', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.MEMBER, 'can_update_own_tasks'))
  })

  test('project_member does NOT have can_create_task', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MEMBER, 'can_create_task'))
  })

  test('project_member does NOT have can_assign_task', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.MEMBER, 'can_assign_task'))
  })
})

// ============================================================================
// hasProjectPermission — Viewer
// ============================================================================
test.group('hasProjectPermission | Viewer', () => {
  test('project_viewer has can_view_all_tasks', ({ assert }) => {
    assert.isTrue(hasProjectPermission(ProjectRole.VIEWER, 'can_view_all_tasks'))
  })

  test('project_viewer does NOT have can_update_own_tasks', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.VIEWER, 'can_update_own_tasks'))
  })

  test('project_viewer does NOT have can_create_task', ({ assert }) => {
    assert.isFalse(hasProjectPermission(ProjectRole.VIEWER, 'can_create_task'))
  })
})

// ============================================================================
// getOrgRoleLevel — Hierarchy
// ============================================================================
test.group('getOrgRoleLevel | Hierarchy', () => {
  test('org_owner has level 1 (highest)', ({ assert }) => {
    assert.equal(getOrgRoleLevel(OrganizationRole.OWNER), 1)
  })

  test('org_admin has level 2', ({ assert }) => {
    assert.equal(getOrgRoleLevel(OrganizationRole.ADMIN), 2)
  })

  test('org_member has level 3', ({ assert }) => {
    assert.equal(getOrgRoleLevel(OrganizationRole.MEMBER), 3)
  })

  test('unknown role has level 0', ({ assert }) => {
    assert.equal(getOrgRoleLevel('nonexistent'), 0)
  })

  test('hierarchy ordering: owner < admin < member (lower = more powerful)', ({ assert }) => {
    assert.isBelow(getOrgRoleLevel(OrganizationRole.OWNER), getOrgRoleLevel(OrganizationRole.ADMIN))
    assert.isBelow(
      getOrgRoleLevel(OrganizationRole.ADMIN),
      getOrgRoleLevel(OrganizationRole.MEMBER)
    )
  })
})

// ============================================================================
// getProjectRoleLevel — Hierarchy
// ============================================================================
test.group('getProjectRoleLevel | Hierarchy', () => {
  test('project_owner has level 1 (highest)', ({ assert }) => {
    assert.equal(getProjectRoleLevel(ProjectRole.OWNER), 1)
  })

  test('project_manager has level 2', ({ assert }) => {
    assert.equal(getProjectRoleLevel(ProjectRole.MANAGER), 2)
  })

  test('project_member has level 3', ({ assert }) => {
    assert.equal(getProjectRoleLevel(ProjectRole.MEMBER), 3)
  })

  test('project_viewer has level 4', ({ assert }) => {
    assert.equal(getProjectRoleLevel(ProjectRole.VIEWER), 4)
  })

  test('unknown role has level 0', ({ assert }) => {
    assert.equal(getProjectRoleLevel('nonexistent'), 0)
  })

  test('hierarchy ordering: owner < manager < member < viewer', ({ assert }) => {
    assert.isBelow(getProjectRoleLevel(ProjectRole.OWNER), getProjectRoleLevel(ProjectRole.MANAGER))
    assert.isBelow(
      getProjectRoleLevel(ProjectRole.MANAGER),
      getProjectRoleLevel(ProjectRole.MEMBER)
    )
    assert.isBelow(getProjectRoleLevel(ProjectRole.MEMBER), getProjectRoleLevel(ProjectRole.VIEWER))
  })
})

// ============================================================================
// Cross-validation: Permissions match DB schema (PostgreSQL v3)
// DB permission functions have hardcoded permission sets.
// These tests validate app constants match DB function definitions.
// ============================================================================
test.group('Cross-validation | App constants match DB schema', () => {
  // DB: check_system_permission() — system_admin permissions
  const DB_SYSTEM_ADMIN_PERMISSIONS = [
    'can_manage_users',
    'can_view_all_organizations',
    'can_view_system_logs',
    'can_view_reports',
    'can_manage_system_settings',
  ]

  test('system_admin permissions match DB function check_system_permission()', ({ assert }) => {
    const appPerms = [...SYSTEM_ROLE_PERMISSIONS[SystemRoleName.SYSTEM_ADMIN]]
    assert.deepEqual(appPerms.sort(), DB_SYSTEM_ADMIN_PERMISSIONS.sort())
  })

  // DB: check_organization_permission() — org_owner permissions (13)
  const DB_ORG_OWNER_PERMISSIONS = [
    'can_create_project',
    'can_manage_members',
    'can_delete_organization',
    'can_view_all_projects',
    'can_transfer_ownership',
    'can_manage_billing',
    'can_manage_settings',
    'can_create_custom_roles',
    'can_invite_members',
    'can_approve_members',
    'can_remove_members',
    'can_view_audit_logs',
    'can_manage_integrations',
  ]

  test('org_owner permissions match DB function check_organization_permission()', ({ assert }) => {
    const appPerms = [...ORG_ROLE_PERMISSIONS[OrganizationRole.OWNER]]
    assert.deepEqual(appPerms.sort(), DB_ORG_OWNER_PERMISSIONS.sort())
  })

  // DB: check_organization_permission() — org_admin permissions (8)
  const DB_ORG_ADMIN_PERMISSIONS = [
    'can_create_project',
    'can_manage_members',
    'can_view_all_projects',
    'can_invite_members',
    'can_approve_members',
    'can_remove_members',
    'can_manage_settings',
    'can_view_audit_logs',
  ]

  test('org_admin permissions match DB function check_organization_permission()', ({ assert }) => {
    const appPerms = [...ORG_ROLE_PERMISSIONS[OrganizationRole.ADMIN]]
    assert.deepEqual(appPerms.sort(), DB_ORG_ADMIN_PERMISSIONS.sort())
  })

  // DB: check_organization_permission() — org_member permissions (5)
  const DB_ORG_MEMBER_PERMISSIONS = [
    'can_view_assigned_projects',
    'can_update_own_tasks',
    'can_view_organization_info',
    'can_comment_on_tasks',
    'can_upload_task_files',
  ]

  test('org_member permissions match DB function check_organization_permission()', ({ assert }) => {
    const appPerms = [...ORG_ROLE_PERMISSIONS[OrganizationRole.MEMBER]]
    assert.deepEqual(appPerms.sort(), DB_ORG_MEMBER_PERMISSIONS.sort())
  })

  // DB: check_project_permission() — project_owner permissions (13)
  const DB_PROJECT_OWNER_PERMISSIONS = [
    'can_delete_project',
    'can_manage_members',
    'can_create_task',
    'can_assign_task',
    'can_update_any_task',
    'can_delete_any_task',
    'can_invite_freelancer',
    'can_approve_application',
    'can_transfer_ownership',
    'can_manage_project_settings',
    'can_view_all_tasks',
    'can_manage_project_budget',
    'can_export_project_data',
  ]

  test('project_owner permissions match DB function check_project_permission()', ({ assert }) => {
    const appPerms = [...PROJECT_ROLE_PERMISSIONS[ProjectRole.OWNER]]
    assert.deepEqual(appPerms.sort(), DB_PROJECT_OWNER_PERMISSIONS.sort())
  })

  // DB: check_project_permission() — project_manager permissions (11)
  const DB_PROJECT_MANAGER_PERMISSIONS = [
    'can_manage_members',
    'can_create_task',
    'can_assign_task',
    'can_update_task',
    'can_delete_task',
    'can_invite_freelancer',
    'can_approve_application',
    'can_view_all_tasks',
    'can_review_completed_tasks',
    'can_manage_task_priorities',
    'can_view_project_reports',
  ]

  test('project_manager permissions match DB function check_project_permission()', ({ assert }) => {
    const appPerms = [...PROJECT_ROLE_PERMISSIONS[ProjectRole.MANAGER]]
    assert.deepEqual(appPerms.sort(), DB_PROJECT_MANAGER_PERMISSIONS.sort())
  })

  // DB: check_project_permission() — project_member permissions (4)
  const DB_PROJECT_MEMBER_PERMISSIONS = [
    'can_view_assigned_tasks',
    'can_update_own_tasks',
    'can_comment_on_tasks',
    'can_upload_task_files',
  ]

  test('project_member permissions match DB function check_project_permission()', ({ assert }) => {
    const appPerms = [...PROJECT_ROLE_PERMISSIONS[ProjectRole.MEMBER]]
    assert.deepEqual(appPerms.sort(), DB_PROJECT_MEMBER_PERMISSIONS.sort())
  })

  // DB: check_project_permission() — project_viewer permissions (1)
  test('project_viewer permissions match DB function check_project_permission()', ({ assert }) => {
    const appPerms = [...PROJECT_ROLE_PERMISSIONS[ProjectRole.VIEWER]]
    assert.deepEqual(appPerms, ['can_view_all_tasks'])
  })

  // DB: get_user_org_role_level() returns 1 for owner, 2 for admin, 3 for member
  test('org role levels match DB function get_user_org_role_level()', ({ assert }) => {
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.OWNER], 1)
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.ADMIN], 2)
    assert.equal(ORG_ROLE_LEVEL[OrganizationRole.MEMBER], 3)
  })

  // DB: get_user_project_role_level() returns 1-4
  test('project role levels match DB function get_user_project_role_level()', ({ assert }) => {
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.OWNER], 1)
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.MANAGER], 2)
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.MEMBER], 3)
    assert.equal(PROJECT_ROLE_LEVEL[ProjectRole.VIEWER], 4)
  })
})
