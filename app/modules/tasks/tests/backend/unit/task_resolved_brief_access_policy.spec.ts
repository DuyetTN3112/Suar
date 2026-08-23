import { test } from '@japa/runner'

import {
  resolveTaskResolvedBriefAudience,
  type TaskResolvedBriefAudience,
} from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'
import type { TaskPermissionContext } from '#modules/tasks/domain/task-authoring/task_types'

function context(overrides: Partial<TaskPermissionContext> = {}): TaskPermissionContext {
  return {
    actorId: 'viewer',
    actorOrgRole: null,
    actorProjectRole: null,
    taskCreatorId: 'creator',
    taskAssignedTo: null,
    taskOrganizationId: 'organization',
    taskProjectId: 'project',
    taskVisibility: 'all',
    isActiveAssignee: false,
    ...overrides,
  }
}

test.group('Task resolved brief access policy', () => {
  test('creator alone receives creator-edit authoring provenance', ({ assert }) => {
    assert.equal(
      resolveTaskResolvedBriefAudience(context({ actorId: 'creator' })),
      'creator_edit'
    )
  })

  test('direct and active assignment participants receive the executable brief', ({ assert }) => {
    const audiences: TaskResolvedBriefAudience[] = [
      resolveTaskResolvedBriefAudience(
        context({ actorId: 'assignee', taskAssignedTo: 'assignee' })
      ),
      resolveTaskResolvedBriefAudience(
        context({ actorId: 'active-assignee', isActiveAssignee: true })
      ),
    ]

    assert.deepEqual(audiences, ['work_participant', 'work_participant'])
  })

  test('project participants receive the published project projection without authoring access', ({
    assert,
  }) => {
    const projectContexts: TaskPermissionContext[] = [
      context({ actorOrgRole: 'org_owner' }),
      context({ actorOrgRole: 'org_admin' }),
      context({ actorProjectRole: 'project_owner' }),
      context({ actorProjectRole: 'project_manager' }),
      context({ actorProjectRole: 'project_member' }),
      context({ actorProjectRole: 'project_viewer' }),
    ]

    for (const candidate of projectContexts) {
      assert.equal(resolveTaskResolvedBriefAudience(candidate), 'project_member')
    }

    assert.equal(
      resolveTaskResolvedBriefAudience(
        context({ actorOrgRole: null, actorProjectRole: null, taskVisibility: 'external' })
      ),
      'public_preview'
    )
  })
})
