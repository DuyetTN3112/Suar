import { test } from '@japa/runner'

import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import {
  canCreateProject,
  canUpdateProject,
  canUpdateProjectFields,
  canDeleteProject,
  canManageProjectMembers,
  canAddProjectMember,
  canRemoveProjectMember,
  canTransferProjectOwnership,
  canViewProject,
  calculateProjectPermissions,
} from '#modules/projects/domain/project_permission_policy'
import { SystemRoleName } from '#modules/users/constants/user_constants'

const BASE_CTX = {
  actorId: 'user-001',
  actorSystemRole: null as string | null,
  actorOrgRole: null as string | null,
  actorProjectRole: null as string | null,
  projectCreatorId: 'creator-001',
  projectOwnerId: 'owner-001',
  projectOrganizationId: 'org-001',
}

function assertDenied(
  assert: { isFalse(value: boolean): void; equal(actual: unknown, expected: unknown): void },
  result: { allowed: boolean; code?: string },
  code: string
): void {
  assert.isFalse(result.allowed)
  assert.equal(result.code, code)
}

test.group('Project permission policy', () => {
  test('project creation, edit, view, and field update permissions preserve the core hierarchy', ({
    assert,
  }) => {
    assert.isTrue(
      canCreateProject({
        actorSystemRole: SystemRoleName.SUPERADMIN,
        isOrgAdminOrOwner: false,
      }).allowed
    )
    assert.isTrue(
      canCreateProject({
        actorSystemRole: null,
        isOrgAdminOrOwner: true,
      }).allowed
    )
    assertDenied(
      assert,
      canCreateProject({
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        isOrgAdminOrOwner: false,
      }),
      'FORBIDDEN'
    )

    for (const ctx of [
      { ...BASE_CTX, actorSystemRole: SystemRoleName.SUPERADMIN },
      { ...BASE_CTX, actorId: 'owner-001' },
      { ...BASE_CTX, actorId: 'creator-001' },
      { ...BASE_CTX, actorOrgRole: OrganizationRole.ADMIN },
      { ...BASE_CTX, actorProjectRole: ProjectRole.MANAGER },
    ]) {
      assert.isTrue(canUpdateProject(ctx).allowed)
    }

    assertDenied(
      assert,
      canUpdateProject({ ...BASE_CTX, actorProjectRole: ProjectRole.MEMBER }),
      'FORBIDDEN'
    )
    assert.isTrue(canViewProject({ ...BASE_CTX, actorProjectRole: ProjectRole.VIEWER }).allowed)
    assertDenied(assert, canViewProject(BASE_CTX), 'FORBIDDEN')
    const unrestricted = canUpdateProjectFields({ ...BASE_CTX, actorId: 'owner-001' }, [
      'name',
      'budget',
    ])
    const allowedManager = canUpdateProjectFields(
      { ...BASE_CTX, actorProjectRole: ProjectRole.MANAGER },
      ['description', 'start_date', 'status']
    )
    const deniedManager = canUpdateProjectFields(
      { ...BASE_CTX, actorProjectRole: ProjectRole.MANAGER },
      ['name', 'budget']
    )

    assert.isTrue(unrestricted.allowed)
    if (unrestricted.allowed) {
      assert.isNull(unrestricted.fieldRestrictions)
    }
    assert.isTrue(allowedManager.allowed)
    assertDenied(assert, deniedManager, 'FORBIDDEN')
  })

  test('destructive and membership mutations enforce authority, org membership, and protected targets', ({
    assert,
  }) => {
    assert.isTrue(
      canDeleteProject({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        incompleteTaskCount: 0,
      }).allowed
    )
    assertDenied(
      assert,
      canDeleteProject({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        incompleteTaskCount: 3,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canDeleteProject({
        actorId: 'member-001',
        actorSystemRole: null,
        actorOrgRole: OrganizationRole.MEMBER,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        incompleteTaskCount: 0,
      }),
      'FORBIDDEN'
    )
    assert.isTrue(canManageProjectMembers({ ...BASE_CTX, actorId: 'owner-001' }).allowed)
    assertDenied(
      assert,
      canManageProjectMembers({ ...BASE_CTX, actorProjectRole: ProjectRole.MANAGER }),
      'FORBIDDEN'
    )

    assert.isTrue(
      canAddProjectMember({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        isTargetOrgMember: true,
        isAlreadyMember: false,
        targetRole: ProjectRole.MEMBER,
      }).allowed
    )
    assertDenied(
      assert,
      canAddProjectMember({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        isTargetOrgMember: false,
        isAlreadyMember: false,
        targetRole: ProjectRole.MEMBER,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canAddProjectMember({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        isTargetOrgMember: true,
        isAlreadyMember: true,
        targetRole: ProjectRole.MEMBER,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canRemoveProjectMember({
        actorId: 'owner-001',
        actorSystemRole: null,
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
        targetUserId: 'owner-001',
      }),
      'BUSINESS_RULE'
    )
  })

  test('ownership transfer and calculated permission snapshots separate owner, admin, and unrelated users', ({
    assert,
  }) => {
    assert.isTrue(
      canTransferProjectOwnership({
        actorId: 'owner-001',
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        newOwnerId: 'member-001',
        isNewOwnerOrgMember: true,
      }).allowed
    )
    assertDenied(
      assert,
      canTransferProjectOwnership({
        actorId: 'owner-001',
        actorOrgRole: null,
        projectOwnerId: 'owner-001',
        newOwnerId: 'owner-001',
        isNewOwnerOrgMember: true,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canTransferProjectOwnership({
        actorId: 'member-001',
        actorOrgRole: OrganizationRole.MEMBER,
        projectOwnerId: 'owner-001',
        newOwnerId: 'member-002',
        isNewOwnerOrgMember: true,
      }),
      'FORBIDDEN'
    )

    const owner = calculateProjectPermissions({ ...BASE_CTX, actorId: 'owner-001' })
    const admin = calculateProjectPermissions({
      ...BASE_CTX,
      actorId: 'admin-001',
      actorOrgRole: OrganizationRole.ADMIN,
    })
    const unrelated = calculateProjectPermissions(BASE_CTX)

    assert.isTrue(owner.isOwner)
    assert.isTrue(owner.canTransferOwnership)
    assert.isTrue(admin.canManageMembers)
    assert.isFalse(unrelated.canEdit)
    assert.isFalse(unrelated.canDelete)
  })
})
