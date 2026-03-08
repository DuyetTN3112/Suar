import { test } from '@japa/runner'
import {
  canUpdateTask,
  canUpdateTaskStatus,
  canUpdateTaskTime,
  canAssignTask,
  canDeleteTask,
  canRevokeTaskAccess,
  canUpdateTaskFields,
  canPermanentDeleteTask,
  canViewTask,
  calculateTaskPermissions,
  canCreateTask,
} from '#actions/tasks/rules/task_permission_policy'
import type { TaskPermissionContext } from '#actions/tasks/rules/task_types'
import { SystemRoleName } from '#constants/user_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'

/**
 * Tests for task permission policies.
 * All pure functions — no database required.
 */

// ============================================================================
// Helper: base context factory
// ============================================================================

function baseCtx(overrides: Partial<TaskPermissionContext> = {}): TaskPermissionContext {
  return {
    actorId: 'actor-001',
    actorSystemRole: SystemRoleName.REGISTERED_USER,
    actorOrgRole: OrganizationRole.MEMBER,
    actorProjectRole: null,
    taskCreatorId: 'creator-001',
    taskAssignedTo: null,
    taskOrganizationId: 'org-001',
    taskProjectId: null,
    isActiveAssignee: false,
    ...overrides,
  }
}

// ============================================================================
// canUpdateTask
// ============================================================================

test.group('canUpdateTask', () => {
  test('superadmin can update any task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }))
    assert.isTrue(result.allowed)
  })

  test('system_admin can update any task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorSystemRole: SystemRoleName.SYSTEM_ADMIN }))
    assert.isTrue(result.allowed)
  })

  test('creator can update own task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorId: 'creator-001' }))
    assert.isTrue(result.allowed)
  })

  test('assignee can update assigned task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }))
    assert.isTrue(result.allowed)
  })

  test('active assignee can update task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ isActiveAssignee: true }))
    assert.isTrue(result.allowed)
  })

  test('org owner can update task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorOrgRole: OrganizationRole.OWNER }))
    assert.isTrue(result.allowed)
  })

  test('org admin can update task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    assert.isTrue(result.allowed)
  })

  test('project owner can update task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorProjectRole: ProjectRole.OWNER }))
    assert.isTrue(result.allowed)
  })

  test('project manager can update task', ({ assert }) => {
    const result = canUpdateTask(baseCtx({ actorProjectRole: ProjectRole.MANAGER }))
    assert.isTrue(result.allowed)
  })

  test('org member without any role is denied', ({ assert }) => {
    const result = canUpdateTask(
      baseCtx({
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MEMBER,
      })
    )
    assert.isFalse(result.allowed)
  })

  test('random user with no role is denied', ({ assert }) => {
    const result = canUpdateTask(
      baseCtx({ actorSystemRole: null, actorOrgRole: null, actorProjectRole: null })
    )
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canUpdateTaskStatus — delegates to canUpdateTask
// ============================================================================

test.group('canUpdateTaskStatus', () => {
  test('has same rules as canUpdateTask', ({ assert }) => {
    const ctxAllow = baseCtx({ actorId: 'creator-001' })
    const ctxDeny = baseCtx({ actorOrgRole: null, actorProjectRole: null })
    assert.isTrue(canUpdateTaskStatus(ctxAllow).allowed)
    assert.isFalse(canUpdateTaskStatus(ctxDeny).allowed)
  })
})

// ============================================================================
// canUpdateTaskTime — delegates to canUpdateTask
// ============================================================================

test.group('canUpdateTaskTime', () => {
  test('has same rules as canUpdateTask', ({ assert }) => {
    const ctxAllow = baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN })
    const ctxDeny = baseCtx({ actorOrgRole: null, actorProjectRole: null })
    assert.isTrue(canUpdateTaskTime(ctxAllow).allowed)
    assert.isFalse(canUpdateTaskTime(ctxDeny).allowed)
  })
})

// ============================================================================
// canAssignTask
// ============================================================================

test.group('canAssignTask', () => {
  test('superadmin can assign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }))
    assert.isTrue(result.allowed)
  })

  test('creator can assign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorId: 'creator-001' }))
    assert.isTrue(result.allowed)
  })

  test('current assignee can reassign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }))
    assert.isTrue(result.allowed)
  })

  test('org owner can assign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorOrgRole: OrganizationRole.OWNER }))
    assert.isTrue(result.allowed)
  })

  test('org admin can assign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    assert.isTrue(result.allowed)
  })

  test('project manager can assign', ({ assert }) => {
    const result = canAssignTask(baseCtx({ actorProjectRole: ProjectRole.MANAGER }))
    assert.isTrue(result.allowed)
  })

  test('regular member cannot assign', ({ assert }) => {
    const result = canAssignTask(
      baseCtx({ actorOrgRole: OrganizationRole.MEMBER, actorProjectRole: null })
    )
    assert.isFalse(result.allowed)
  })

  test('active assignee flag does NOT grant assign permission', ({ assert }) => {
    // canAssignTask does not check isActiveAssignee (unlike canUpdateTask)
    const result = canAssignTask(
      baseCtx({
        isActiveAssignee: true,
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: null,
      })
    )
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canDeleteTask
// ============================================================================

test.group('canDeleteTask', () => {
  test('superadmin who is org member can delete', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
      isActorOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('superadmin who is NOT org member is denied', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
      isActorOrgMember: false,
    })
    assert.isFalse(result.allowed)
  })

  test('creator can delete own task', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorId: 'creator-001' }),
      isActorOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('org owner can delete task', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorOrgRole: OrganizationRole.OWNER }),
      isActorOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('org admin can delete task', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      isActorOrgMember: true,
    })
    assert.isTrue(result.allowed)
  })

  test('assignee CANNOT delete task (only update)', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      isActorOrgMember: true,
    })
    assert.isFalse(result.allowed)
  })

  test('regular member cannot delete', ({ assert }) => {
    const result = canDeleteTask({
      ...baseCtx({ actorOrgRole: OrganizationRole.MEMBER }),
      isActorOrgMember: true,
    })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canRevokeTaskAccess
// ============================================================================

test.group('canRevokeTaskAccess', () => {
  test('superadmin can revoke', ({ assert }) => {
    const result = canRevokeTaskAccess(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }))
    assert.isTrue(result.allowed)
  })

  test('creator can revoke', ({ assert }) => {
    const result = canRevokeTaskAccess(baseCtx({ actorId: 'creator-001' }))
    assert.isTrue(result.allowed)
  })

  test('project manager can revoke', ({ assert }) => {
    const result = canRevokeTaskAccess(baseCtx({ actorProjectRole: ProjectRole.MANAGER }))
    assert.isTrue(result.allowed)
  })

  test('member cannot revoke', ({ assert }) => {
    const result = canRevokeTaskAccess(
      baseCtx({ actorOrgRole: OrganizationRole.MEMBER, actorProjectRole: null })
    )
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canUpdateTaskFields — field-level restrictions
// ============================================================================

test.group('canUpdateTaskFields', () => {
  test('superadmin has no field restrictions', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }), [
      'title',
      'assigned_to',
      'priority',
    ])
    assert.isTrue(result.allowed)
    assert.isNull(result.fieldRestrictions)
  })

  test('creator has no field restrictions', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorId: 'creator-001' }), [
      'title',
      'assigned_to',
    ])
    assert.isTrue(result.allowed)
    assert.isNull(result.fieldRestrictions)
  })

  test('assignee has no field restrictions', ({ assert }) => {
    const result = canUpdateTaskFields(
      baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      ['title', 'priority']
    )
    assert.isTrue(result.allowed)
    assert.isNull(result.fieldRestrictions)
  })

  test('org admin can update allowed fields', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'description',
      'status',
      'due_date',
      'estimated_time',
    ])
    assert.isTrue(result.allowed)
    assert.isNotNull(result.fieldRestrictions)
  })

  test('org owner can update allowed fields', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.OWNER }), [
      'description',
    ])
    assert.isTrue(result.allowed)
  })

  test('org admin denied for restricted fields (title)', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'title',
      'description',
    ])
    assert.isFalse(result.allowed)
  })

  test('org admin denied for restricted fields (assigned_to)', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'assigned_to',
    ])
    assert.isFalse(result.allowed)
  })

  test('project manager has no field restrictions', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorProjectRole: ProjectRole.MANAGER }), [
      'title',
      'assigned_to',
      'priority',
    ])
    assert.isTrue(result.allowed)
    assert.isNull(result.fieldRestrictions)
  })

  test('random user denied for any fields', ({ assert }) => {
    const result = canUpdateTaskFields(baseCtx({ actorOrgRole: null, actorProjectRole: null }), [
      'description',
    ])
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canPermanentDeleteTask
// ============================================================================

test.group('canPermanentDeleteTask', () => {
  test('superadmin can permanent delete', ({ assert }) => {
    const result = canPermanentDeleteTask({ actorSystemRole: SystemRoleName.SUPERADMIN })
    assert.isTrue(result.allowed)
  })

  test('system_admin can permanent delete', ({ assert }) => {
    const result = canPermanentDeleteTask({ actorSystemRole: SystemRoleName.SYSTEM_ADMIN })
    assert.isTrue(result.allowed)
  })

  test('denied: regular user cannot permanent delete', ({ assert }) => {
    const result = canPermanentDeleteTask({ actorSystemRole: SystemRoleName.REGISTERED_USER })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })

  test('denied: null role cannot permanent delete', ({ assert }) => {
    const result = canPermanentDeleteTask({ actorSystemRole: null })
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// canViewTask
// ============================================================================

test.group('canViewTask', () => {
  test('superadmin can view any task', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }))
    assert.isTrue(result.allowed)
  })

  test('creator can view their task', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorId: 'creator-001' }))
    assert.isTrue(result.allowed)
  })

  test('assignee can view their task', ({ assert }) => {
    const result = canViewTask(baseCtx({ taskAssignedTo: 'actor-001' }))
    assert.isTrue(result.allowed)
  })

  test('active assignee can view task', ({ assert }) => {
    const result = canViewTask(baseCtx({ isActiveAssignee: true }))
    assert.isTrue(result.allowed)
  })

  test('org owner can view task', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorOrgRole: OrganizationRole.OWNER }))
    assert.isTrue(result.allowed)
  })

  test('org admin can view task', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    assert.isTrue(result.allowed)
  })

  test('project manager can view task', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorProjectRole: ProjectRole.MANAGER }))
    assert.isTrue(result.allowed)
  })

  test('denied: unrelated user cannot view', ({ assert }) => {
    const result = canViewTask(baseCtx({ actorOrgRole: null, actorProjectRole: null }))
    assert.isFalse(result.allowed)
  })
})

// ============================================================================
// calculateTaskPermissions
// ============================================================================

test.group('calculateTaskPermissions', () => {
  test('creator has full permissions', ({ assert }) => {
    const perms = calculateTaskPermissions(baseCtx({ actorId: 'creator-001' }))
    assert.isTrue(perms.isCreator)
    assert.isFalse(perms.isAssignee)
    assert.isTrue(perms.canEdit)
    assert.isTrue(perms.canDelete)
    assert.isTrue(perms.canAssign)
  })

  test('assignee has edit/assign but not delete', ({ assert }) => {
    const perms = calculateTaskPermissions(
      baseCtx({ taskAssignedTo: 'actor-001', actorOrgRole: null })
    )
    assert.isFalse(perms.isCreator)
    assert.isTrue(perms.isAssignee)
    assert.isTrue(perms.canEdit)
    assert.isFalse(perms.canDelete)
    assert.isTrue(perms.canAssign)
  })

  test('unrelated user has no permissions', ({ assert }) => {
    const perms = calculateTaskPermissions(baseCtx({ actorOrgRole: null, actorProjectRole: null }))
    assert.isFalse(perms.isCreator)
    assert.isFalse(perms.isAssignee)
    assert.isFalse(perms.canEdit)
    assert.isFalse(perms.canDelete)
    assert.isFalse(perms.canAssign)
  })

  test('org admin can edit and delete but is not creator', ({ assert }) => {
    const perms = calculateTaskPermissions(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    assert.isFalse(perms.isCreator)
    assert.isTrue(perms.canEdit)
    assert.isTrue(perms.canDelete)
    assert.isTrue(perms.canAssign)
  })

  test('superadmin has full permissions', ({ assert }) => {
    const perms = calculateTaskPermissions(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }))
    assert.isTrue(perms.canEdit)
    assert.isTrue(perms.canDelete)
    assert.isTrue(perms.canAssign)
  })
})

// ============================================================================
// canCreateTask
// ============================================================================

test.group('canCreateTask', () => {
  test('org admin/owner can create task', ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: true,
      isProjectManagerOrOwner: false,
      hasProjectId: false,
    })
    assert.isTrue(result.allowed)
  })

  test('project manager can create task with project', ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: true,
      hasProjectId: true,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: project manager without project id', ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: true,
      hasProjectId: false,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: regular member cannot create task', ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: false,
      hasProjectId: false,
    })
    assert.isFalse(result.allowed)
  })

  test('denied: regular member even with project', ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: false,
      hasProjectId: true,
    })
    assert.isFalse(result.allowed)
  })
})
