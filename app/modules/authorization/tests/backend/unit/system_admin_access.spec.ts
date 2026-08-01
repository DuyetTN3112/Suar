import { test } from '@japa/runner'

import { customSystemRoleApi } from '#modules/authorization/public_contracts/custom_system_role_api'
import {
  canAccessAllowedSystemRoles,
  canAccessSystemAdministration,
} from '#modules/authorization/public_contracts/system_admin_access'

function withCustomPermissions(permissionsByRole: Record<string, string[]>) {
  const original = customSystemRoleApi.getRolePermissions.bind(customSystemRoleApi)
  Object.defineProperty(customSystemRoleApi, 'getRolePermissions', {
    configurable: true,
    value: (role: string) => Promise.resolve(permissionsByRole[role] ?? null),
  })
  return () => {
    Object.defineProperty(customSystemRoleApi, 'getRolePermissions', {
      configurable: true,
      value: original,
    })
  }
}

test.group('System admin access', () => {
  test('custom system role without stored permissions is not auto-admitted', async ({ assert }) => {
    const restore = withCustomPermissions({ custom_empty: [] })
    try {
      const decision = await canAccessSystemAdministration('custom_empty')
      assert.isFalse(decision.allowed)
    } finally {
      restore()
    }
  })

  test('custom system role must overlap the allowed system role permission set', async ({
    assert,
  }) => {
    const restore = withCustomPermissions({
      audit_reader: ['can_view_system_logs'],
      unrelated: ['can_export_project_data'],
    })
    try {
      const auditDecision = await canAccessAllowedSystemRoles('audit_reader', ['system_admin'])
      const unrelatedDecision = await canAccessAllowedSystemRoles('unrelated', ['system_admin'])

      assert.isTrue(auditDecision.allowed)
      assert.isFalse(unrelatedDecision.allowed)
    } finally {
      restore()
    }
  })
})
