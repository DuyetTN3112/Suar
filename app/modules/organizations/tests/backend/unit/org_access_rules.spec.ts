import { test } from '@japa/runner'

import {
  ORG_ROLE_PRESETS,
  buildOrganizationDepartmentCoverage,
  getAssignableOrganizationRoles,
  hasOrganizationRolePermission,
  sanitizeCustomRoleDefinitions,
} from '#modules/organizations/access/domain/org_access_rules'

test.group('Organization access rules', () => {
  test('sanitize custom roles normalizes names, removes duplicates and built-ins, and trims payloads', ({
    assert,
  }) => {
    const result = sanitizeCustomRoleDefinitions([
      {
        name: '  HR Team  ',
        description: '  Recruit and onboard  ',
        permissions: ['can_invite_members', 'can_invite_members', ' can_manage_members '],
      },
      {
        name: 'org_admin',
        permissions: ['can_manage_members'],
      },
      {
        name: 'hr_team',
        permissions: ['can_view_audit_logs'],
      },
      null,
      'invalid',
    ])

    assert.deepEqual(result, [
      {
        name: 'hr_team',
        description: 'Recruit and onboard',
        permissions: ['can_invite_members', 'can_manage_members'],
      },
    ])
  })

  test('assignable roles always keep builtin admin/member and append sanitized custom roles', ({
    assert,
  }) => {
    const roles = getAssignableOrganizationRoles([
      { name: 'cto', permissions: ['can_create_project'] },
      { name: 'CTO', permissions: ['can_view_all_projects'] },
    ])

    assert.deepEqual(roles, ['org_admin', 'org_member', 'cto'])
  })

  test('department coverage estimates headcount from matching roles and exposes presets', ({
    assert,
  }) => {
    assert.isAtLeast(ORG_ROLE_PRESETS.length, 4)

    const coverage = buildOrganizationDepartmentCoverage(
      new Map<string, number>([
        ['org_owner', 1],
        ['cto', 1],
        ['pm', 2],
      ])
    )

    const leadership = coverage.find((department) => department.id === 'leadership')
    const delivery = coverage.find((department) => department.id === 'delivery')

    assert.isDefined(leadership)
    assert.isDefined(delivery)
    assert.deepEqual(leadership?.matchedRoles, ['org_owner', 'cto'])
    assert.equal(leadership?.estimatedHeadcount, 2)
    assert.deepEqual(delivery?.matchedRoles, ['pm'])
    assert.equal(delivery?.estimatedHeadcount, 2)
  })

  test('permission checks support built-in and organization-scoped custom roles', ({ assert }) => {
    const customRoles = [
      {
        name: 'compliance_reviewer',
        permissions: ['can_view_audit_logs'],
      },
    ]

    assert.isTrue(hasOrganizationRolePermission('org_owner', customRoles, 'can_view_audit_logs'))
    assert.isTrue(
      hasOrganizationRolePermission('compliance_reviewer', customRoles, 'can_view_audit_logs')
    )
    assert.isFalse(
      hasOrganizationRolePermission('compliance_reviewer', customRoles, 'can_manage_settings')
    )
    assert.isFalse(
      hasOrganizationRolePermission('unknown_role', customRoles, 'can_view_audit_logs')
    )
  })
})
