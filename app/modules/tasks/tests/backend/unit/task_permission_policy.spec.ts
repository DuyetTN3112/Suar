import { test } from '@japa/runner'

import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
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
  canViewTaskOnMarketplace,
  canViewTaskAuditLogs,
  calculateTaskPermissions,
  canCreateTask,
  resolveTaskCollectionReadScope,
} from '#modules/tasks/domain/task-assignment/task_permission_policy'
import type { TaskPermissionContext } from '#modules/tasks/domain/task-authoring/task_types'

function baseCtx(overrides: Partial<TaskPermissionContext> = {}): TaskPermissionContext {
  return {
    actorId: 'actor-001',
    actorOrgRole: OrganizationRole.MEMBER,
    actorProjectRole: null,
    taskCreatorId: 'creator-001',
    taskAssignedTo: null,
    taskOrganizationId: 'org-001',
    taskProjectId: null,
    taskVisibility: 'internal',
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
    const broadAccessContexts = [
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      baseCtx({ isActiveAssignee: true }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
      baseCtx({ actorProjectRole: ProjectRole.MEMBER }),
    ]
    const statusAccessContexts = [
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
      baseCtx({ actorProjectRole: ProjectRole.MEMBER }),
      baseCtx({ isActiveAssignee: true }),
    ]
    const denied = baseCtx({
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: null,
    })

    for (const evaluate of [canUpdateTask, canUpdateTaskTime, canViewTask]) {
      for (const ctx of broadAccessContexts) {
        assert.isTrue(evaluate(ctx).allowed)
      }
      assertDenied(assert, evaluate(denied), 'FORBIDDEN')
    }

    for (const ctx of statusAccessContexts) {
      assert.isTrue(canUpdateTaskStatus(ctx).allowed)
    }
    assert.isTrue(
      canUpdateTaskStatus(
        baseCtx({ actorOrgRole: OrganizationRole.ADMIN, actorProjectRole: null })
      ).allowed
    )
    assertDenied(
      assert,
      canUpdateTaskStatus(baseCtx({ actorId: 'creator-001', actorProjectRole: null })),
      'FORBIDDEN'
    )
  })

  test('assignment and revoke access require stronger authority than active-assignee-only access', ({
    assert,
  }) => {
    for (const ctx of [
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
    ]) {
      assert.isTrue(canAssignTask(ctx).allowed)
    }

    for (const ctx of [
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

  test('marketplace-visible tasks can be opened by unaffiliated users as read-only detail', ({
    assert,
  }) => {
    const unaffiliated = {
      actorOrgRole: null,
      actorProjectRole: null,
    }

    assert.isTrue(canViewTask(baseCtx({ ...unaffiliated, taskVisibility: 'external' })).allowed)
    assert.isTrue(canViewTask(baseCtx({ ...unaffiliated, taskVisibility: 'all' })).allowed)
    assertDenied(
      assert,
      canViewTask(baseCtx({ ...unaffiliated, taskVisibility: 'internal' })),
      'FORBIDDEN'
    )

    const permissions = calculateTaskPermissions(
      baseCtx({ ...unaffiliated, taskVisibility: 'external' })
    )

    assert.isFalse(permissions.canEdit)
    assert.isFalse(permissions.canDelete)
    assert.isFalse(permissions.canAssign)
    assert.isFalse(permissions.canChangeStatus)
  })

  test('marketplace detail separates opportunity preview from project board access', ({ assert }) => {
    const publicPreview = canViewTaskOnMarketplace({
      ...baseCtx({ actorOrgRole: null, actorProjectRole: null, taskVisibility: 'external' }),
      isApprovedOrganizationMember: false,
      projectVisibility: 'public',
      allowExternalContributors: true,
    })
    assert.isTrue(publicPreview.allowed)

    assert.isTrue(
      canViewTaskOnMarketplace({
        ...baseCtx({ taskVisibility: 'internal' }),
        isApprovedOrganizationMember: true,
        projectVisibility: 'private',
        allowExternalContributors: false,
      }).allowed
    )

    assertDenied(
      assert,
      canViewTaskOnMarketplace({
        ...baseCtx({ actorOrgRole: null, actorProjectRole: null, taskVisibility: 'external' }),
        isApprovedOrganizationMember: false,
        projectVisibility: 'team',
        allowExternalContributors: true,
      }),
      'FORBIDDEN'
    )
  })

  test('task audit logs exclude marketplace and read-only project viewers', ({ assert }) => {
    for (const ctx of [
      baseCtx({ actorId: 'creator-001' }),
      baseCtx({ taskAssignedTo: 'actor-001' }),
      baseCtx({ isActiveAssignee: true }),
      baseCtx({ actorOrgRole: OrganizationRole.ADMIN }),
      baseCtx({ actorProjectRole: ProjectRole.MANAGER }),
    ]) {
      assert.isTrue(canViewTaskAuditLogs(ctx).allowed)
    }

    for (const ctx of [
      baseCtx({
        actorOrgRole: null,
        actorProjectRole: null,
        taskVisibility: 'external',
      }),
      baseCtx({ actorProjectRole: ProjectRole.MEMBER }),
      baseCtx({ actorProjectRole: ProjectRole.VIEWER }),
      baseCtx({ actorOrgRole: OrganizationRole.MEMBER, actorProjectRole: null }),
    ]) {
      assertDenied(assert, canViewTaskAuditLogs(ctx), 'FORBIDDEN')
    }
  })

  test('destructive boundaries stay stricter than creation scope and require explicit authority', ({
    assert,
  }) => {
    assertDenied(
      assert,
      canDeleteTask({
        ...baseCtx({ actorOrgRole: null, actorProjectRole: null }),
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
    assert.isTrue(
      canDeleteTask({
        ...baseCtx({ actorProjectRole: ProjectRole.MEMBER }),
        isActorOrgMember: true,
      }).allowed
    )
    assertDenied(assert, canPermanentDeleteTask(), 'FORBIDDEN')
    assert.isTrue(
      canCreateTask({
        actorOrgRole: OrganizationRole.ADMIN,
        actorProjectRole: null,
        projectId: 'project-001',
      }).allowed
    )
    assert.isTrue(
      canCreateTask({
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MANAGER,
        projectId: 'project-001',
      }).allowed
    )
    assert.isTrue(
      canCreateTask({
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MEMBER,
        projectId: 'project-001',
      }).allowed
    )
    assertDenied(
      assert,
      canCreateTask({
        actorOrgRole: OrganizationRole.MEMBER,
        actorProjectRole: ProjectRole.MANAGER,
        projectId: null,
      }),
      'FORBIDDEN'
    )
    assertDenied(
      assert,
      canCreateTask({
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
      canUpdateTaskFields(baseCtx({ actorId: 'creator-001' }), ['title', 'priority']),
      canUpdateTaskFields(baseCtx({ actorId: 'actor-001', taskAssignedTo: 'actor-001' }), [
        'title',
        'priority',
      ]),
      canUpdateTaskFields(baseCtx({ actorProjectRole: ProjectRole.MANAGER }), [
        'title',
        'assigned_to',
      ]),
      canUpdateTaskFields(baseCtx({ actorProjectRole: ProjectRole.MEMBER }), [
        'title',
        'assigned_to',
      ]),
    ]) {
      assert.isTrue(result.allowed)
      if (result.allowed) {
        assert.isNull(result.fieldRestrictions)
      }
    }

    assertDenied(
      assert,
      canUpdateTaskFields(
        baseCtx({
          actorOrgRole: null,
          actorProjectRole: null,
        }),
        ['title']
      ),
      'FORBIDDEN'
    )
    const allowedOrgAdmin = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'description',
      'status',
      'due_date',
      'estimated_time',
    ])
    const unrestrictedOrgAdmin = canUpdateTaskFields(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }), [
      'title',
      'assigned_to',
    ])

    assert.isTrue(allowedOrgAdmin.allowed)
    if (allowedOrgAdmin.allowed) {
      assert.isNull(allowedOrgAdmin.fieldRestrictions)
    }
    assert.isTrue(unrestrictedOrgAdmin.allowed)
    if (unrestrictedOrgAdmin.allowed) {
      assert.isNull(unrestrictedOrgAdmin.fieldRestrictions)
    }
    const creator = calculateTaskPermissions(baseCtx({ actorId: 'creator-001' }))
    const assignee = calculateTaskPermissions(
      baseCtx({ taskAssignedTo: 'actor-001', actorOrgRole: null })
    )
    const admin = calculateTaskPermissions(baseCtx({ actorOrgRole: OrganizationRole.ADMIN }))
    const member = calculateTaskPermissions(baseCtx({ actorOrgRole: OrganizationRole.MEMBER }))
    const projectMember = calculateTaskPermissions(
      baseCtx({ actorOrgRole: null, actorProjectRole: ProjectRole.MEMBER })
    )
    const projectViewer = calculateTaskPermissions(
      baseCtx({ actorOrgRole: null, actorProjectRole: ProjectRole.VIEWER })
    )
    const unrelated = calculateTaskPermissions(
      baseCtx({ actorOrgRole: null, actorProjectRole: null })
    )

    assert.isTrue(creator.isCreator)
    assert.isTrue(creator.canDelete)
    assert.isTrue(assignee.isAssignee)
    assert.isFalse(assignee.canDelete)
    assert.isTrue(admin.canAssign)
    assert.isFalse(member.canComment)
    assert.isTrue(projectMember.canComment)
    assert.isTrue(projectViewer.canComment)
    assert.isFalse(unrelated.canComment)
    assert.isFalse(unrelated.canEdit)
    assert.isFalse(unrelated.canAssign)
  })

  test('collection read scope and task reordering stay aligned with org membership boundaries', ({
    assert,
  }) => {
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorOrgRole: null,
        unaffiliatedScope: 'none',
      }),
      { type: 'none' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorOrgRole: OrganizationRole.ADMIN,
        unaffiliatedScope: 'own_only',
      }),
      { type: 'all' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorOrgRole: OrganizationRole.MEMBER,
        unaffiliatedScope: 'none',
      }),
      { type: 'own_or_assigned', actorId: 'actor-001' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorOrgRole: null,
        unaffiliatedScope: 'own_only',
      }),
      { type: 'own_only', actorId: 'actor-001' }
    )
    assert.deepEqual(
      resolveTaskCollectionReadScope({
        actorId: 'actor-001',
        actorOrgRole: null,
        unaffiliatedScope: 'none',
      }),
      { type: 'none' }
    )

    assert.isTrue(canReorderTask({ actorOrgRole: OrganizationRole.MEMBER }).allowed)
    assertDenied(assert, canReorderTask({ actorOrgRole: null }), 'FORBIDDEN')
  })

  test('project members can read the complete task collection of the selected project', ({
    assert,
  }) => {
    const scope = resolveTaskCollectionReadScope({
      actorId: 'actor-001',
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: 'project_member',
      projectId: 'project-001',
      unaffiliatedScope: 'none',
    })

    assert.deepEqual(scope, { type: 'project', projectId: 'project-001' })
  })
})
