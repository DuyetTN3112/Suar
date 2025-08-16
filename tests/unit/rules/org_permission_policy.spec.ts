import { test } from '@japa/runner'

import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import {
  canTransferOwnership,
  canRemoveMember,
  canDeleteOrganization,
  canChangeRole,
  canAddMember,
  canProcessJoinRequest,
  canCreateJoinRequest,
  checkJoinEligibility,
} from '#modules/organizations/domain/org_permission_policy'

function assertDenied(
  assert: {
    isFalse(value: boolean): void
    equal(actual: unknown, expected: unknown): void
    include(haystack: string, needle: string): void
  },
  result: { allowed: boolean; code?: string; reason?: string },
  code: string,
  reasonPart?: string
): void {
  assert.isFalse(result.allowed)
  assert.equal(result.code, code)
  if (reasonPart && typeof result.reason === 'string') {
    assert.include(result.reason, reasonPart)
  }
}

test.group('Organization permission policy', () => {
  test('ownership transfer only allows the current owner to hand off to approved admins or owners', ({
    assert,
  }) => {
    for (const newOwnerRole of [OrganizationRole.ADMIN, OrganizationRole.OWNER]) {
      assert.isTrue(
        canTransferOwnership({
          actorId: 'owner-001',
          currentOwnerId: 'owner-001',
          newOwnerId: 'target-001',
          newOwnerRole,
          isNewOwnerApprovedMember: true,
        }).allowed
      )
    }

    assertDenied(
      assert,
      canTransferOwnership({
        actorId: 'admin-001',
        currentOwnerId: 'owner-001',
        newOwnerId: 'target-001',
        newOwnerRole: OrganizationRole.ADMIN,
        isNewOwnerApprovedMember: true,
      }),
      'FORBIDDEN'
    )
    assertDenied(
      assert,
      canTransferOwnership({
        actorId: 'owner-001',
        currentOwnerId: 'owner-001',
        newOwnerId: 'owner-001',
        newOwnerRole: OrganizationRole.OWNER,
        isNewOwnerApprovedMember: true,
      }),
      'BUSINESS_RULE',
      'chính mình'
    )
  })

  test('member mutations and role changes preserve admin boundaries and owner protections', ({
    assert,
  }) => {
    assert.isTrue(
      canRemoveMember({
        actorId: 'owner-001',
        actorOrgRole: OrganizationRole.OWNER,
        targetUserId: 'admin-001',
        targetOrgRole: OrganizationRole.ADMIN,
      }).allowed
    )
    assert.isTrue(
      canAddMember({
        actorOrgRole: OrganizationRole.ADMIN,
        targetRoleId: OrganizationRole.MEMBER,
        isAlreadyMember: false,
      }).allowed
    )
    assert.isTrue(
      canChangeRole({
        actorOrgRole: OrganizationRole.ADMIN,
        targetCurrentRole: OrganizationRole.ADMIN,
        targetNewRole: OrganizationRole.MEMBER,
        isSelfUpdate: false,
      }).allowed
    )

    assertDenied(
      assert,
      canRemoveMember({
        actorId: 'admin-001',
        actorOrgRole: OrganizationRole.ADMIN,
        targetUserId: 'owner-001',
        targetOrgRole: OrganizationRole.OWNER,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canAddMember({
        actorOrgRole: OrganizationRole.ADMIN,
        targetRoleId: 'invalid_role',
        isAlreadyMember: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canChangeRole({
        actorOrgRole: OrganizationRole.ADMIN,
        targetCurrentRole: OrganizationRole.MEMBER,
        targetNewRole: OrganizationRole.ADMIN,
        isSelfUpdate: true,
      }),
      'BUSINESS_RULE'
    )
  })

  test('organization deletion and join-request workflows enforce prerequisites and fresh-applicant eligibility', ({
    assert,
  }) => {
    assert.isTrue(
      canDeleteOrganization({
        actorId: 'owner-001',
        actorOrgRole: OrganizationRole.OWNER,
        activeProjectCount: 0,
      }).allowed
    )
    assertDenied(
      assert,
      canDeleteOrganization({
        actorId: 'owner-001',
        actorOrgRole: OrganizationRole.OWNER,
        activeProjectCount: 3,
      }),
      'BUSINESS_RULE',
      '3'
    )
    assert.isTrue(
      canProcessJoinRequest({
        actorOrgRole: OrganizationRole.ADMIN,
        requestStatus: 'pending',
        isTargetAlreadyMember: false,
      }).allowed
    )
    assertDenied(
      assert,
      canProcessJoinRequest({
        actorOrgRole: OrganizationRole.ADMIN,
        requestStatus: 'approved',
        isTargetAlreadyMember: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canProcessJoinRequest({
        actorOrgRole: OrganizationRole.ADMIN,
        requestStatus: 'pending',
        isTargetAlreadyMember: true,
      }),
      'BUSINESS_RULE'
    )
    assert.isTrue(
      canCreateJoinRequest({ isAlreadyMember: false, hasPendingRequest: false }).allowed
    )
    assertDenied(
      assert,
      canCreateJoinRequest({ isAlreadyMember: true, hasPendingRequest: false }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canCreateJoinRequest({ isAlreadyMember: false, hasPendingRequest: true }),
      'BUSINESS_RULE'
    )

    assert.deepEqual(checkJoinEligibility(null), { eligible: true, message: '' })
    assert.deepEqual(checkJoinEligibility('rejected'), { eligible: true, message: '' })
    assert.isFalse(checkJoinEligibility('approved').eligible)
    assert.isFalse(checkJoinEligibility('pending').eligible)
    assert.isFalse(checkJoinEligibility('unknown').eligible)
  })
})
