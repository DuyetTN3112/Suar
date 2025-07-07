import { test } from '@japa/runner'

import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'
import {
  canUpdateTask,
  canUpdateTaskStatus,
  canUpdateTaskTime,
  canAssignTask,
  canReorderTask,
  canDeleteTask,
  canRevokeTaskAccess,
  canUpdateTaskFields,
  canPermanentDeleteTask,
  canViewTask,
  calculateTaskPermissions,
  canCreateTask,
  resolveTaskCollectionReadScope,
} from '#domain/tasks/task_permission_policy'
import type { TaskPermissionContext } from '#domain/tasks/task_types'

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

function assertDenied(
  assert: { isFalse(value: boolean): void; equal(actual: unknown, expected: unknown): void },
  result: { allowed: boolean; code?: string },
  code: string
): void {
  assert.isFalse(result.allowed)
  assert.equal(result.code, code)
}

test.group('Task permission policy', () => {
  test('edit-like permissions share privileged paths while unrelated actors stay denied', ({
    assert,
  }) => {
    const evaluators = [canUpdateTask, canUpdateTaskStatus, canUpdateTaskTime, canViewTask]
    const allowedContexts = [
      baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
      baseCtx({ actorSystemRole: SystemRoleName.SYSTEM_ADMIN }),
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      baseCtx({ isActiveAssignee: true }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
    ]
    const denied = baseCtx({
      actorSystemRole: null,
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: ProjectRole.MEMBER,
    })

    for (const evaluate of evaluators) {
      for (const ctx of allowedContexts) {
        assert.isTrue(evaluate(ctx).allowed)
      }
      assertDenied(assert, evaluate(denied), 'FORBIDDEN')
    }
  })

  test('assignment and revoke access require stronger authority than active-assignee-only access', ({
    assert,
  }) => {
    for (const ctx of [
      baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
    ]) {
      assert.isTrue(canAssignTask(ctx).allowed)
    }

    for (const ctx of [
      baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
    ]) {
      assert.isTrue(canRevokeTaskAccess(ctx).allowed)
    }

    assertDenied(
      assert,
      canAssignTask(
        baseCtx({
          isActiveAssignee: true,
          actorOrgRole: OrganizationRole.MEMBER,
          actorProjectRole: null,
        })
      ),
      'FORBIDDEN'
    )
    assertDenied(
      assert,
      canRevokeTaskAccess(
        baseCtx({ actorOrgRole: OrganizationRole.MEMBER, actorProjectRole: null })
      ),
      'FORBIDDEN'
    )
  })

  test('destructive boundaries stay stricter than creation scope and require explicit authority', ({
    assert,
  }) => {
    assert.isTrue(
      canDeleteTask({
        ...baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
        isActorOrgMember: true,
      }).allowed
    )
    assertDenied(
      assert,
      canDeleteTask({
        ...baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }),
        isActorOrgMember: false,
      }),
      'FORBIDDEN'
    )
    assertDenied(
      assert,
      canDeleteTask({
        ...baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
        isActorOrgMember: true,
      }),
      'FORBIDDEN'
    )
    assert.isTrue(canPermanentDeleteTask({ actorSystemRole: SystemRoleName.SUPERADMIN }).allowed)
    assertDenied(
      assert,
      canPermanentDeleteTask({ actorSystemRole: SystemRoleName.REGISTERED_USER }),
      'FORBIDDEN'
    )
    assert.isTrue(
      canCreateTask({
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.ADMIN,
        actorProjectRole: null,
        projectId: 'project-001',
      }).allowed
    )
    assert.isTrue(
      canCreateTask({
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MANAGER,
        projectId: 'project-001',
      }).allowed
    )
    assert.isTrue(
      canCreateTask({
        actorSystemRole: SystemRoleName.SUPERADMIN,
        actorOrgRole: null,
        actorProjectRole: null,
        projectId: null,
      }).allowed
    )
    assertDenied(
      assert,
      canCreateTask({
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MANAGER,
        projectId: null,
      }),
      'FORBIDDEN'
    )
    assertDenied(
      assert,
      canCreateTask({
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: null,
        projectId: null,
      }),
      'FORBIDDEN'
    )
  })

  test('field update restrictions and permission snapshots distinguish privileged, scoped, and unrelated actors', ({
    assert,
  }) => {
    for (const result of [
      canUpdateTaskFields(baseCtx({ actorSystemRole: SystemRoleName.SUPERADMIN }), [
        'title',
        'assigned_to',
      ]),
      canUpdateTaskFields(baseCtx({ actorId: 'creator-001' }), ['title', 'priority']),
      canUpdateTaskFields(baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }), [
        'title',
        'priority',
      ]),
      canUpdateTaskFields(baseCtx({ actorProjectRole: ProjectRole.MANAGER }), [
        'title',
        'assigned_to',
      ]),
    ]) {
      assert.isTrue(result.allowed)
      if (result.allowed) {
        assert.isNull(result.fieldRestrictions)
      }
    }

    const allowedOrgAdmin = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'description',
      'status',
      'due_date',
      'estimated_time',
    ])
    const deniedOrgAdmin = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'title',
      'assigned_to',
    ])

    assert.isTrue(allowedOrgAdmin.allowed)
    if (allowedOrgAdmin.allowed) {
      assert.deepEqual(allowedOrgAdmin.fieldRestrictions, [
        'description',
        'status',
        'due_date',
        'estimated_time',
      ])
    }
    assertDenied(assert, deniedOrgAdmin, 'FORBIDDEN')
    const creator = calculateTaskPermissions(baseCtx({ actorId: 'creator-001' }))
    const assignee = calculateTaskPermissions(
      baseCtx({ taskAssignedTo: 'actor-001', actorOrgRole: null })
    )
    const admin = calculateTaskPermissions(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    const unrelated = calculateTaskPermissions(
      baseCtx({ actorOrgRole: null, actorProjectRole: null })
    )

    assert.isTrue(creator.isCreator)
    assert.isTrue(creator.canDelete)
    assert.isTrue(assignee.isAssignee)
    assert.isFalse(assignee.canDelete)
    assert.isTrue(admin.canAssign)
    assert.isFalse(unrelated.canEdit)
    assert.isFalse(unrelated.canAssign)
  })

  test('collection read scope and task reordering stay aligned with org membership boundaries', ({
    assert,
  }) => {
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorSystemRole: SystemRoleName.SUPERADMIN,
        actorOrgRole: null,
        unaffiliatedScope: 'none',
      }),
      { type: 'all' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.ADMIN,
        unaffiliatedScope: 'own_only',
      }),
      { type: 'all' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorSystemRole: SystemRoleName.REGISTERED_USER,
        actorOrgRole: OrganizationRole.MEMBER,
        unaffiliatedScope: 'none',
      }),
      { type: 'own_or_assigned', actorId: 'actor-001' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorSystemRole: null,
        actorOrgRole: null,
        unaffiliatedScope: 'own_only',
      }),
      { type: 'own_only', actorId: 'actor-001' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorSystemRole: null,
        actorOrgRole: null,
        unaffiliatedScope: 'none',
      }),
      { type: 'none' }
    )

    assert.isTrue(canReorderTask({ actorOrgRole: OrganizationRole.MEMBER }).allowed)
    assertDenied(assert, canReorderTask({ actorOrgRole: null }), 'FORBIDDEN')
  })
})
