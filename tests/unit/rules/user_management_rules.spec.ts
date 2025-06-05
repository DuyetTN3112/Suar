import { test } from '@japa/runner'
import {
  canApproveUser,
  canChangeUserRole,
  canDeactivateUser,
  validateSystemRole,
} from '#domain/users/user_management_rules'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationUserStatus } from '#constants/organization_constants'

/**
 * Tests for user management rules.
 * All pure functions — no database required.
 */

// ============================================================================
// canApproveUser
// ============================================================================

test.group('canApproveUser', () => {
  test('allow: has permission + target is pending', ({ assert }) => {
    const result = canApproveUser({
      hasApprovePermission: true,
      targetMembershipStatus: OrganizationUserStatus.PENDING,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: no approve permission', ({ assert }) => {
    const result = canApproveUser({
      hasApprovePermission: false,
      targetMembershipStatus: OrganizationUserStatus.PENDING,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: target already approved', ({ assert }) => {
    const result = canApproveUser({
      hasApprovePermission: true,
      targetMembershipStatus: OrganizationUserStatus.APPROVED,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: target is rejected', ({ assert }) => {
    const result = canApproveUser({
      hasApprovePermission: true,
      targetMembershipStatus: OrganizationUserStatus.REJECTED,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canChangeUserRole
// ============================================================================

test.group('canChangeUserRole', () => {
  test('allow: superadmin changes another user to valid role', ({ assert }) => {
    const result = canChangeUserRole({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'user-001',
      newRole: SystemRoleName.SYSTEM_ADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('allow: superadmin changes to registered_user', ({ assert }) => {
    const result = canChangeUserRole({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'user-001',
      newRole: SystemRoleName.REGISTERED_USER,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: not superadmin', ({ assert }) => {
    const result = canChangeUserRole({
      isActorSuperadmin: false,
      actorId: 'user-001',
      targetUserId: 'user-002',
      newRole: SystemRoleName.SYSTEM_ADMIN,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: changing own role', ({ assert }) => {
    const result = canChangeUserRole({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'admin-001',
      newRole: SystemRoleName.REGISTERED_USER,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: invalid role', ({ assert }) => {
    const result = canChangeUserRole({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'user-001',
      newRole: 'invalid_role',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canDeactivateUser
// ============================================================================

test.group('canDeactivateUser', () => {
  test('allow: superadmin deactivates another user', ({ assert }) => {
    const result = canDeactivateUser({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'user-001',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: not superadmin', ({ assert }) => {
    const result = canDeactivateUser({
      isActorSuperadmin: false,
      actorId: 'user-001',
      targetUserId: 'user-002',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: deactivating self', ({ assert }) => {
    const result = canDeactivateUser({
      isActorSuperadmin: true,
      actorId: 'admin-001',
      targetUserId: 'admin-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// validateSystemRole
// ============================================================================

test.group('validateSystemRole', () => {
  test('allow: superadmin', ({ assert }) => {
    const result = validateSystemRole(SystemRoleName.SUPERADMIN)
    assert.isTrue(result.allowed)
  })

  test('allow: system_admin', ({ assert }) => {
    const result = validateSystemRole(SystemRoleName.SYSTEM_ADMIN)
    assert.isTrue(result.allowed)
  })

  test('allow: registered_user', ({ assert }) => {
    const result = validateSystemRole(SystemRoleName.REGISTERED_USER)
    assert.isTrue(result.allowed)
  })

  test('denied: invalid role', ({ assert }) => {
    const result = validateSystemRole('moderator')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: empty string', ({ assert }) => {
    const result = validateSystemRole('')
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})
