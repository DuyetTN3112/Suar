import { test } from '@japa/runner'
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
} from '#actions/projects/rules/project_permission_policy'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'

/**
 * Tests for project permission policies.
 * All pure functions — no database required.
 */

// ============================================================================
// canCreateProject
// ============================================================================

test.group('canCreateProject', () => {
  test('superadmin can create project', ({ assert }) => {
    const result = canCreateProject({
      actorSystemRole: SystemRoleName.SUPERADMIN,
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('system_admin can create project', ({ assert }) => {
    const result = canCreateProject({
      actorSystemRole: SystemRoleName.SYSTEM_ADMIN,
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('org admin/owner can create project', ({ assert }) => {
    const result = canCreateProject({
      actorSystemRole: null,
      isOrgAdminOrOwner: true,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: regular member cannot create project', ({ assert }) => {
    const result = canCreateProject({
      actorSystemRole: SystemRoleName.REGISTERED_USER,
      isOrgAdminOrOwner: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canUpdateProject
// ============================================================================

test.group('canUpdateProject', () => {
  const baseCtx = {
    actorId: 'user-001',
    actorSystemRole: null as string | null,
    actorOrgRole: null as string | null,
    actorProjectRole: null as string | null,
    projectCreatorId: 'creator-001',
    projectOwnerId: 'owner-001',
    projectOrganizationId: 'org-001',
  }

  test('superadmin can update any project', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorSystemRole: SystemRoleName.SUPERADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('project owner can update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorId: 'owner-001',
    })
    assert.isTrue(result.allowed)
  })

  test('project creator can update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorId: 'creator-001',
    })
    assert.isTrue(result.allowed)
  })

  test('org admin can update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorOrgRole: OrganizationRole.ADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('project manager can update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorProjectRole: ProjectRole.MANAGER,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: project member cannot update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorProjectRole: ProjectRole.MEMBER,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: project viewer cannot update', ({ assert }) => {
    const result = canUpdateProject({
      ...baseCtx,
      actorProjectRole: ProjectRole.VIEWER,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canUpdateProjectFields
// ============================================================================

test.group('canUpdateProjectFields', () => {
  const baseCtx = {
    actorId: 'user-001',
    actorSystemRole: null as string | null,
    actorOrgRole: null as string | null,
    actorProjectRole: null as string | null,
    projectCreatorId: 'creator-001',
    projectOwnerId: 'owner-001',
    projectOrganizationId: 'org-001',
  }

  test('owner has no field restrictions', ({ assert }) => {
    const result = canUpdateProjectFields({ ...baseCtx, actorId: 'owner-001' }, [
      'name',
      'budget',
      'description',
    ])
    assert.isTrue(result.allowed)
    if (result.allowed) assert.isNull(result.fieldRestrictions)
  })

  test('superadmin has no field restrictions', ({ assert }) => {
    const result = canUpdateProjectFields(
      { ...baseCtx, actorSystemRole: SystemRoleName.SUPERADMIN },
      ['name', 'budget']
    )
    assert.isTrue(result.allowed)
    if (result.allowed) assert.isNull(result.fieldRestrictions)
  })

  test('manager can update allowed fields', ({ assert }) => {
    const result = canUpdateProjectFields({ ...baseCtx, actorProjectRole: ProjectRole.MANAGER }, [
      'description',
      'status',
    ])
    assert.isTrue(result.allowed)
    if (result.allowed) assert.isNotNull(result.fieldRestrictions)
  })

  test('manager denied for restricted fields', ({ assert }) => {
    const result = canUpdateProjectFields({ ...baseCtx, actorProjectRole: ProjectRole.MANAGER }, [
      'name',
      'budget',
    ])
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: member cannot update any fields', ({ assert }) => {
    const result = canUpdateProjectFields({ ...baseCtx, actorProjectRole: ProjectRole.MEMBER }, [
      'description',
    ])
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canDeleteProject
// ============================================================================

test.group('canDeleteProject', () => {
  test('owner can delete project with 0 incomplete tasks', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 0,
    })
    assert.isTrue(result.allowed)
  })

  test('superadmin can delete project', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'admin-001',
      actorSystemRole: SystemRoleName.SUPERADMIN,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 0,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: has incomplete tasks', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 3,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: regular member cannot delete', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'member-001',
      actorSystemRole: null,
      actorOrgRole: OrganizationRole.MEMBER,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 0,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('org admin can delete if 0 tasks', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'admin-001',
      actorSystemRole: null,
      actorOrgRole: OrganizationRole.ADMIN,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 0,
    })
    assert.isTrue(result.allowed)
  })

  test('permission check fires before task check', ({ assert }) => {
    const result = canDeleteProject({
      actorId: 'nobody-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      incompleteTaskCount: 5,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canManageProjectMembers
// ============================================================================

test.group('canManageProjectMembers', () => {
  const baseCtx = {
    actorId: 'user-001',
    actorSystemRole: null as string | null,
    actorOrgRole: null as string | null,
    actorProjectRole: null as string | null,
    projectCreatorId: 'creator-001',
    projectOwnerId: 'owner-001',
    projectOrganizationId: 'org-001',
  }

  test('owner can manage members', ({ assert }) => {
    const result = canManageProjectMembers({ ...baseCtx, actorId: 'owner-001' })
    assert.isTrue(result.allowed)
  })

  test('creator can manage members', ({ assert }) => {
    const result = canManageProjectMembers({ ...baseCtx, actorId: 'creator-001' })
    assert.isTrue(result.allowed)
  })

  test('org admin can manage members', ({ assert }) => {
    const result = canManageProjectMembers({
      ...baseCtx,
      actorOrgRole: OrganizationRole.ADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: manager cannot manage members', ({ assert }) => {
    const result = canManageProjectMembers({
      ...baseCtx,
      actorProjectRole: ProjectRole.MANAGER,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canAddProjectMember
// ============================================================================

test.group('canAddProjectMember', () => {
  test('owner can add valid org member', ({ assert }) => {
    const result = canAddProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetRole: ProjectRole.MEMBER,
      isTargetOrgMember: true,
      isAlreadyMember: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: invalid project role', ({ assert }) => {
    const result = canAddProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetRole: 'invalid_role',
      isTargetOrgMember: true,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: target not org member', ({ assert }) => {
    const result = canAddProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetRole: ProjectRole.MEMBER,
      isTargetOrgMember: false,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: already a member', ({ assert }) => {
    const result = canAddProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetRole: ProjectRole.MEMBER,
      isTargetOrgMember: true,
      isAlreadyMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: regular member cannot add', ({ assert }) => {
    const result = canAddProjectMember({
      actorId: 'member-001',
      actorSystemRole: null,
      actorOrgRole: OrganizationRole.MEMBER,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetRole: ProjectRole.MEMBER,
      isTargetOrgMember: true,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canRemoveProjectMember
// ============================================================================

test.group('canRemoveProjectMember', () => {
  test('owner can remove regular member', ({ assert }) => {
    const result = canRemoveProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetUserId: 'member-001',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: cannot remove project owner', ({ assert }) => {
    const result = canRemoveProjectMember({
      actorId: 'admin-001',
      actorSystemRole: SystemRoleName.SUPERADMIN,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetUserId: 'owner-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: cannot remove project creator', ({ assert }) => {
    const result = canRemoveProjectMember({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetUserId: 'creator-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: member cannot remove others', ({ assert }) => {
    const result = canRemoveProjectMember({
      actorId: 'member-001',
      actorSystemRole: null,
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
      targetUserId: 'member-002',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canTransferProjectOwnership
// ============================================================================

test.group('canTransferProjectOwnership', () => {
  test('owner can transfer to org member', ({ assert }) => {
    const result = canTransferProjectOwnership({
      actorId: 'owner-001',
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      newOwnerId: 'member-001',
      isNewOwnerOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('org admin can transfer', ({ assert }) => {
    const result = canTransferProjectOwnership({
      actorId: 'admin-001',
      actorOrgRole: OrganizationRole.ADMIN,
      projectOwnerId: 'owner-001',
      newOwnerId: 'member-001',
      isNewOwnerOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: cannot transfer to self', ({ assert }) => {
    const result = canTransferProjectOwnership({
      actorId: 'owner-001',
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      newOwnerId: 'owner-001',
      isNewOwnerOrgMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: new owner not org member', ({ assert }) => {
    const result = canTransferProjectOwnership({
      actorId: 'owner-001',
      actorOrgRole: null,
      projectOwnerId: 'owner-001',
      newOwnerId: 'outsider-001',
      isNewOwnerOrgMember: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: regular member cannot transfer', ({ assert }) => {
    const result = canTransferProjectOwnership({
      actorId: 'member-001',
      actorOrgRole: OrganizationRole.MEMBER,
      projectOwnerId: 'owner-001',
      newOwnerId: 'member-002',
      isNewOwnerOrgMember: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})

// ============================================================================
// canViewProject
// ============================================================================

test.group('canViewProject', () => {
  const baseCtx = {
    actorId: 'user-001',
    actorSystemRole: null as string | null,
    actorOrgRole: null as string | null,
    actorProjectRole: null as string | null,
    projectCreatorId: 'creator-001',
    projectOwnerId: 'owner-001',
    projectOrganizationId: 'org-001',
  }

  test('superadmin can view any project', ({ assert }) => {
    const result = canViewProject({
      ...baseCtx,
      actorSystemRole: SystemRoleName.SUPERADMIN,
    })
    assert.isTrue(result.allowed)
  })

  test('project member can view', ({ assert }) => {
    const result = canViewProject({
      ...baseCtx,
      actorProjectRole: ProjectRole.VIEWER,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: non-member cannot view', ({ assert }) => {
    const result = canViewProject(baseCtx)
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// calculateProjectPermissions
// ============================================================================

test.group('calculateProjectPermissions', () => {
  test('owner has full permissions', ({ assert }) => {
    const perms = calculateProjectPermissions({
      actorId: 'owner-001',
      actorSystemRole: null,
      actorOrgRole: null,
      actorProjectRole: ProjectRole.OWNER,
      projectCreatorId: 'creator-001',
      projectOwnerId: 'owner-001',
      projectOrganizationId: 'org-001',
    })
    assert.isTrue(perms.isOwner)
    assert.isTrue(perms.canEdit)
    assert.isTrue(perms.canDelete)
    assert.isTrue(perms.canManageMembers)
  })

  test('manager can edit but not delete or manage members', ({ assert }) => {
    const perms = calculateProjectPermissions({
      actorId: 'manager-001',
      actorSystemRole: null,
      actorOrgRole: null,
      actorProjectRole: ProjectRole.MANAGER,
      projectCreatorId: 'creator-001',
      projectOwnerId: 'owner-001',
      projectOrganizationId: 'org-001',
    })
    assert.isFalse(perms.isOwner)
    assert.isTrue(perms.canEdit)
    assert.isFalse(perms.canDelete)
    assert.isFalse(perms.canManageMembers)
  })

  test('viewer has no edit permissions', ({ assert }) => {
    const perms = calculateProjectPermissions({
      actorId: 'viewer-001',
      actorSystemRole: null,
      actorOrgRole: null,
      actorProjectRole: ProjectRole.VIEWER,
      projectCreatorId: 'creator-001',
      projectOwnerId: 'owner-001',
      projectOrganizationId: 'org-001',
    })
    assert.isFalse(perms.isOwner)
    assert.isFalse(perms.canEdit)
    assert.isFalse(perms.canDelete)
    assert.isFalse(perms.canManageMembers)
  })
})
