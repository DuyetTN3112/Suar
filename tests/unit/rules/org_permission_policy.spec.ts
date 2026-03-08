import { test } from '@japa/runner'
import {
  canTransferOwnership,
  canRemoveMember,
  canDeleteOrganization,
  canChangeRole,
  canAddMember,
  canProcessJoinRequest,
  canCreateJoinRequest,
  checkJoinEligibility,
} from '#actions/organizations/rules/org_permission_policy'
import { OrganizationRole } from '#constants/organization_constants'

/**
 * Tests for organization permission policies.
 * All pure functions — no database required.
 */

// ============================================================================
// canTransferOwnership
// ============================================================================

test.group('canTransferOwnership', () => {
  test('owner can transfer to approved admin', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'admin-001',
      newOwnerRole: OrganizationRole.ADMIN,
      isNewOwnerApprovedMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('owner can transfer to another owner', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'other-001',
      newOwnerRole: OrganizationRole.OWNER,
      isNewOwnerApprovedMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: non-owner cannot transfer', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'admin-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'admin-002',
      newOwnerRole: OrganizationRole.ADMIN,
      isNewOwnerApprovedMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: cannot transfer to self', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'owner-001',
      newOwnerRole: OrganizationRole.OWNER,
      isNewOwnerApprovedMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: new owner not approved member', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'pending-001',
      newOwnerRole: OrganizationRole.ADMIN,
      isNewOwnerApprovedMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: new owner is regular member (not admin+)', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'member-001',
      newOwnerRole: OrganizationRole.MEMBER,
      isNewOwnerApprovedMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: new owner has null role', ({ assert }) => {
    const result = canTransferOwnership({
      actorId: 'owner-001',
      currentOwnerId: 'owner-001',
      newOwnerId: 'user-001',
      newOwnerRole: null,
      isNewOwnerApprovedMember: true,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canRemoveMember
// ============================================================================

test.group('canRemoveMember', () => {
  test('owner can remove admin', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'owner-001',
      actorOrgRole: OrganizationRole.OWNER,
      targetUserId: 'admin-001',
      targetOrgRole: OrganizationRole.ADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('owner can remove member', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'owner-001',
      actorOrgRole: OrganizationRole.OWNER,
      targetUserId: 'member-001',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isTrue(result.allowed)
  })

  test('admin can remove member', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'admin-001',
      actorOrgRole: OrganizationRole.ADMIN,
      targetUserId: 'member-001',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: member cannot remove others', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'member-001',
      actorOrgRole: OrganizationRole.MEMBER,
      targetUserId: 'member-002',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: cannot remove owner', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'admin-001',
      actorOrgRole: OrganizationRole.ADMIN,
      targetUserId: 'owner-001',
      targetOrgRole: OrganizationRole.OWNER,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: null role cannot remove', ({ assert }) => {
    const result = canRemoveMember({
      actorId: 'user-001',
      actorOrgRole: null,
      targetUserId: 'member-001',
      targetOrgRole: OrganizationRole.MEMBER,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canDeleteOrganization
// ============================================================================

test.group('canDeleteOrganization', () => {
  test('owner can delete org with no active projects', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'owner-001',
      actorOrgRole: OrganizationRole.OWNER,
      activeProjectCount: 0,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: admin cannot delete org', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'admin-001',
      actorOrgRole: OrganizationRole.ADMIN,
      activeProjectCount: 0,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: member cannot delete org', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'member-001',
      actorOrgRole: OrganizationRole.MEMBER,
      activeProjectCount: 0,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: owner cannot delete org with active projects', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'owner-001',
      actorOrgRole: OrganizationRole.OWNER,
      activeProjectCount: 3,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
      assert.include(result.reason, '3')
    }
  })

  test('denied: even 1 active project blocks deletion', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'owner-001',
      actorOrgRole: OrganizationRole.OWNER,
      activeProjectCount: 1,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: null role cannot delete', ({ assert }) => {
    const result = canDeleteOrganization({
      actorId: 'user-001',
      actorOrgRole: null,
      activeProjectCount: 0,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canChangeRole
// ============================================================================

test.group('canChangeRole', () => {
  test('owner can promote member to admin', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetCurrentRole: OrganizationRole.MEMBER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: false,
    })
    assert.isTrue(result.allowed)
  })

  test('owner can demote admin to member', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetCurrentRole: OrganizationRole.ADMIN,
      targetNewRole: OrganizationRole.MEMBER,
      isSelfUpdate: false,
    })
    assert.isTrue(result.allowed)
  })

  test('admin can change member role', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.ADMIN,
      targetCurrentRole: OrganizationRole.MEMBER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: cannot change owner role', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetCurrentRole: OrganizationRole.OWNER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: cannot promote to owner', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetCurrentRole: OrganizationRole.ADMIN,
      targetNewRole: OrganizationRole.OWNER,
      isSelfUpdate: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: cannot self-update role', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.OWNER,
      targetCurrentRole: OrganizationRole.OWNER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: member cannot change roles', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.MEMBER,
      targetCurrentRole: OrganizationRole.MEMBER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('priority: owner role check fires before self-update', ({ assert }) => {
    const result = canChangeRole({
      actorOrgRole: OrganizationRole.ADMIN,
      targetCurrentRole: OrganizationRole.OWNER,
      targetNewRole: OrganizationRole.ADMIN,
      isSelfUpdate: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.include(result.reason, 'owner')
    }
  })
})

// ============================================================================
// canAddMember
// ============================================================================

test.group('canAddMember', () => {
  test('owner can add member', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.OWNER,
      targetRoleId: OrganizationRole.MEMBER,
      isAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('admin can add member', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.ADMIN,
      targetRoleId: OrganizationRole.MEMBER,
      isAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('owner can add admin', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.OWNER,
      targetRoleId: OrganizationRole.ADMIN,
      isAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: member cannot add', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.MEMBER,
      targetRoleId: OrganizationRole.MEMBER,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: null role cannot add', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: null,
      targetRoleId: OrganizationRole.MEMBER,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: invalid target role', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.OWNER,
      targetRoleId: 'invalid_role',
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: already a member', ({ assert }) => {
    const result = canAddMember({
      actorOrgRole: OrganizationRole.OWNER,
      targetRoleId: OrganizationRole.MEMBER,
      isAlreadyMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })
})

// ============================================================================
// canProcessJoinRequest
// ============================================================================

test.group('canProcessJoinRequest', () => {
  test('owner can process pending request', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.OWNER,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('admin can process pending request', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.ADMIN,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: member cannot process', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.MEMBER,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: null role cannot process', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: null,
      requestStatus: 'pending',
      isTargetAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: request already approved', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.OWNER,
      requestStatus: 'approved',
      isTargetAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: request already rejected', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.OWNER,
      requestStatus: 'rejected',
      isTargetAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: target already a member', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.OWNER,
      requestStatus: 'pending',
      isTargetAlreadyMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('priority: role check fires before status check', ({ assert }) => {
    const result = canProcessJoinRequest({
      actorOrgRole: OrganizationRole.MEMBER,
      requestStatus: 'approved',
      isTargetAlreadyMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.include(result.reason, 'quyền')
    }
  })
})

// ============================================================================
// canCreateJoinRequest
// ============================================================================

test.group('canCreateJoinRequest', () => {
  test('non-member with no pending request can create', ({ assert }) => {
    const result = canCreateJoinRequest({
      isAlreadyMember: false,
      hasPendingRequest: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: already a member', ({ assert }) => {
    const result = canCreateJoinRequest({
      isAlreadyMember: true,
      hasPendingRequest: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: has pending request', ({ assert }) => {
    const result = canCreateJoinRequest({
      isAlreadyMember: false,
      hasPendingRequest: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: both member and has pending request', ({ assert }) => {
    const result = canCreateJoinRequest({
      isAlreadyMember: true,
      hasPendingRequest: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      // Member check fires first
      assert.include(result.reason, 'thành viên')
    }
  })
})

// ============================================================================
// checkJoinEligibility
// ============================================================================

test.group('checkJoinEligibility', () => {
  test('null status means eligible', ({ assert }) => {
    const result = checkJoinEligibility(null)
    assert.isTrue(result.eligible)
    assert.equal(result.message, '')
  })

  test('approved status means not eligible', ({ assert }) => {
    const result = checkJoinEligibility('approved')
    assert.isFalse(result.eligible)
    assert.include(result.message, 'thành viên')
  })

  test('pending status means not eligible', ({ assert }) => {
    const result = checkJoinEligibility('pending')
    assert.isFalse(result.eligible)
    assert.include(result.message, 'chờ')
  })

  test('rejected status returns contact message', ({ assert }) => {
    const result = checkJoinEligibility('rejected')
    assert.isFalse(result.eligible)
    assert.include(result.message, 'từ chối')
  })

  test('unknown status returns rejected message', ({ assert }) => {
    const result = checkJoinEligibility('unknown_status')
    assert.isFalse(result.eligible)
  })
})
