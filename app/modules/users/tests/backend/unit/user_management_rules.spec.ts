import { test } from '@japa/runner'

import {
  canAccessSystemAdministration,
  canAccessAllowedSystemRoles,
} from '#modules/authorization/public_contracts/system_admin_access'
import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import {
  canApproveUser,
  canAccessUserAdministrationQueue,
  canChangeUserRole,
  canDeactivateUser,
  validateSystemRole,
} from '#modules/users/domain/user_management_rules'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

test.group('User management rules', () => {
  test('approval and role validation only allow declared admin workflows', ({ assert }) => {
    const allowed = canApproveUser({
      hasApprovePermission: true,
      targetMembershipStatus: OrganizationUserStatus.PENDING,
    })
    const noPermission = canApproveUser({
      hasApprovePermission: false,
      targetMembershipStatus: OrganizationUserStatus.PENDING,
    })
    const invalidStatuses = [OrganizationUserStatus.APPROVED, OrganizationUserStatus.REJECTED].map(
      (status) =>
        canApproveUser({
          hasApprovePermission: true,
          targetMembershipStatus: status,
        })
    )

    assert.isTrue(allowed.allowed)
    assert.isFalse(noPermission.allowed)
    if (!noPermission.allowed) {
      assert.equal(noPermission.code, 'FORBIDDEN')
    }
    for (const denied of invalidStatuses) {
      assert.isFalse(denied.allowed)
      if (!denied.allowed) {
        assert.equal(denied.code, 'BUSINESS_RULE')
      }
    }
    for (const role of Object.values(SystemRoleName)) {
      assert.isTrue(validateSystemRole(role).allowed)
    }

    const invalidRole = validateSystemRole('moderator')
    assert.isFalse(invalidRole.allowed)
    if (!invalidRole.allowed) {
      assert.equal(invalidRole.code, 'BUSINESS_RULE')
      assert.include(invalidRole.reason, 'moderator')
    }
  })

  test('role changes allow superadmin handoffs but reject authority, self-update, and invalid role violations', ({
    assert,
  }) => {
    for (const newRole of Object.values(SystemRoleName)) {
      const result = canChangeUserRole({
        isActorSuperadmin: true,
        actorId: 'admin-001',
        targetUserId: 'user-001',
        newRole,
      })

      assert.isTrue(result.allowed)
    }

    const deniedCases = [
      {
        result: canChangeUserRole({
          isActorSuperadmin: false,
          actorId: 'user-001',
          targetUserId: 'user-002',
          newRole: SystemRoleName.SYSTEM_ADMIN,
        }),
        code: 'FORBIDDEN',
      },
      {
        result: canChangeUserRole({
          isActorSuperadmin: true,
          actorId: 'admin-001',
          targetUserId: 'admin-001',
          newRole: SystemRoleName.REGISTERED_USER,
        }),
        code: 'BUSINESS_RULE',
      },
      {
        result: canChangeUserRole({
          isActorSuperadmin: true,
          actorId: 'admin-001',
          targetUserId: 'user-001',
          newRole: 'invalid_role',
        }),
        code: 'BUSINESS_RULE',
      },
    ]

    deniedCases.forEach(({ result, code }) => {
      assert.isFalse(result.allowed)
      if (!result.allowed) {
        assert.equal(result.code, code)
      }
    })
  })

  test('user deactivation requires superadmin authority and forbids self-deactivation', ({
    assert,
  }) => {
    const allowed = canDeactivateUser({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'user-001',
    })
    const deniedCases = [
      canDeactivateUser({
        isActorSuperadmin: false,
        actorId: 'user-001',
        targetUserId: 'user-002',
      }),
      canDeactivateUser({
        isActorSuperadmin: true,
        actorId: 'admin-001',
        targetUserId: 'admin-001',
      }),
    ]

    assert.isTrue(allowed.allowed)
    assert.isFalse(deniedCases[0]?.allowed ?? true)
    assert.isFalse(deniedCases[1]?.allowed ?? true)
    if (deniedCases[0] && !deniedCases[0].allowed) {
      assert.equal(deniedCases[0].code, 'FORBIDDEN')
    }
    if (deniedCases[1] && !deniedCases[1].allowed) {
      assert.equal(deniedCases[1].code, 'BUSINESS_RULE')
    }
  })

  test('system admin access helpers centralize middleware-level authorization decisions', async ({
    assert,
  }) => {
    for (const role of [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN]) {
      const systemAccess = await canAccessSystemAdministration(role)
      const systemRoleAccess = await canAccessAllowedSystemRoles(role, [SystemRoleName.REGISTERED_USER])
      assert.isTrue(systemAccess.allowed)
      assert.isTrue(systemRoleAccess.allowed)
      assert.isTrue(
        canAccessUserAdministrationQueue({
          actorSystemRole: role,
        }).allowed
      )
    }

    const registeredUserAccess = await canAccessAllowedSystemRoles(SystemRoleName.REGISTERED_USER, [
      SystemRoleName.REGISTERED_USER,
    ])
    assert.isTrue(registeredUserAccess.allowed)
    assert.isFalse(
      canAccessUserAdministrationQueue({
        actorSystemRole: null,
      }).allowed
    )

    const deniedSystemAccess = await canAccessSystemAdministration(SystemRoleName.REGISTERED_USER)
    const deniedAllowedRole = await canAccessAllowedSystemRoles(null, [SystemRoleName.SYSTEM_ADMIN])
    const deniedQueueAccess = canAccessUserAdministrationQueue({
      actorSystemRole: SystemRoleName.REGISTERED_USER,
    })

    assert.isFalse(deniedSystemAccess.allowed)
    assert.isFalse(deniedAllowedRole.allowed)
    assert.isFalse(deniedQueueAccess.allowed)
    if (!deniedSystemAccess.allowed) {
      assert.equal(deniedSystemAccess.code, 'FORBIDDEN')
    }
    if (!deniedAllowedRole.allowed) {
      assert.equal(deniedAllowedRole.code, 'FORBIDDEN')
    }
    if (!deniedQueueAccess.allowed) {
      assert.equal(deniedQueueAccess.code, 'FORBIDDEN')
    }
  })
})
