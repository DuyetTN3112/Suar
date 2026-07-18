import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import FinalizeTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/task-review/finalize_task_review_workflow_command'
import type { ReviewActorAccessReader } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type {
  ReviewTaskWorkflowPersistenceSession,
  ReviewTaskWorkflowUnitOfWork,
  TaskReviewFinalizedEventWrite,
} from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

test.group('Unit | Finalize task review workflow command', () => {
  test('finalizes only a resolved native workflow and stages its governed event', async ({
    assert,
  }) => {
    const calls: string[] = []
    const session: Pick<
      ReviewTaskWorkflowPersistenceSession,
      | 'loadWorkflow'
      | 'finalizeResolvedWorkflow'
      | 'stageTaskReviewFinalizedEvent'
      | 'listReviewerIds'
      | 'stageNotification'
    > = {
      loadWorkflow: async () => {
        await Promise.resolve()
        return {
          id: 'workflow-1',
          taskId: 'task-1',
          taskAssignmentId: 'assignment-1',
          projectId: 'project-1',
          organizationId: 'organization-1',
          revieweeId: 'reviewee-1',
          status: 'resolved' as const,
          requiredReviewCount: 2,
        }
      },
      finalizeResolvedWorkflow: async (input: { workflowId: string; actorId: string }) => {
        await Promise.resolve()
        calls.push(`finalize:${input.workflowId}:${input.actorId}`)
      },
      stageTaskReviewFinalizedEvent: async (input: {
        workflowId: string
        taskAssignmentId: string
        finalizationSource: string
      }) => {
        await Promise.resolve()
        calls.push(
          `event:${input.workflowId}:${input.taskAssignmentId}:${input.finalizationSource}`
        )
      },
      listReviewerIds: async () => {
        await Promise.resolve()
        return ['reviewer-1', 'reviewer-2']
      },
      stageNotification: async (input: {
        recipientIds: readonly string[]
        parameters: unknown
      }) => {
        await Promise.resolve()
        calls.push(`notification:${input.recipientIds.join(',')}`)
        assert.deepInclude(input.parameters, { profileProjection: 'queued' })
      },
    }
    const workflows: Pick<ReviewTaskWorkflowUnitOfWork, 'run'> = {
      run: <T>(work: (persistence: ReviewTaskWorkflowPersistenceSession) => Promise<T>) =>
        work(session as ReviewTaskWorkflowPersistenceSession),
    }
    const actorAccess: ReviewActorAccessReader = {
      findActorAccess: async () => {
        await Promise.resolve()
        return { systemRole: 'system_admin' }
      },
      findOrganizationMembership: async () => {
        await Promise.resolve()
        return null
      },
    }

    const result = await new FinalizeTaskReviewWorkflowCommand(
      makeSystemReviewActionContext('admin-1'),
      actorAccess,
      workflows as ReviewTaskWorkflowUnitOfWork
    ).execute({ workflowId: 'workflow-1' })

    assert.deepEqual(result, {
      workflowId: 'workflow-1',
      taskId: 'task-1',
      projectId: 'project-1',
    })
    assert.deepEqual(calls, [
      'finalize:workflow-1:admin-1',
      'event:workflow-1:assignment-1:admin_resolution',
      'notification:reviewee-1,reviewer-1,reviewer-2',
    ])
  })

  test('rejects a member who is not an organization governor', async ({ assert }) => {
    const actorAccess: ReviewActorAccessReader = {
      findActorAccess: async () => {
        await Promise.resolve()
        return { systemRole: 'organization_admin' }
      },
      findOrganizationMembership: async () => {
        await Promise.resolve()
        return { role: 'org_member', status: 'approved' }
      },
    }
    const workflows: Pick<ReviewTaskWorkflowUnitOfWork, 'run'> = {
      run: <T>(work: (persistence: ReviewTaskWorkflowPersistenceSession) => Promise<T>) =>
        work({
          loadWorkflow: () =>
            Promise.resolve({
              id: 'workflow-1',
              taskId: 'task-1',
              taskAssignmentId: 'assignment-1',
              projectId: 'project-1',
              organizationId: 'organization-1',
              revieweeId: 'reviewee-1',
              status: 'resolved',
              requiredReviewCount: 2,
            }),
        } as unknown as ReviewTaskWorkflowPersistenceSession),
    }

    await assert.rejects(
      () =>
        new FinalizeTaskReviewWorkflowCommand(
          makeSystemReviewActionContext('organization-admin-1'),
          actorAccess,
          workflows as ReviewTaskWorkflowUnitOfWork
        ).execute({ workflowId: 'workflow-1' }),
      ForbiddenException
    )
  })

  test('allows an approved organization administrator and records its governance source', async ({
    assert,
  }) => {
    let finalizationSource = ''
    const workflows: Pick<ReviewTaskWorkflowUnitOfWork, 'run'> = {
      run: <T>(work: (persistence: ReviewTaskWorkflowPersistenceSession) => Promise<T>) =>
        work({
          loadWorkflow: () =>
            Promise.resolve({
              id: 'workflow-1',
              taskId: 'task-1',
              taskAssignmentId: 'assignment-1',
              projectId: 'project-1',
              organizationId: 'organization-1',
              revieweeId: 'reviewee-1',
              status: 'resolved',
              requiredReviewCount: 2,
            }),
          finalizeResolvedWorkflow: () => Promise.resolve(),
          stageTaskReviewFinalizedEvent: (input: TaskReviewFinalizedEventWrite) => {
            finalizationSource = input.finalizationSource
            return Promise.resolve()
          },
          listReviewerIds: () => Promise.resolve([]),
          stageNotification: () => Promise.resolve(),
        } as unknown as ReviewTaskWorkflowPersistenceSession),
    }
    const actorAccess: ReviewActorAccessReader = {
      findActorAccess: () => Promise.resolve({ systemRole: 'registered_user' }),
      findOrganizationMembership: () => Promise.resolve({ role: 'org_admin', status: 'approved' }),
    }

    await new FinalizeTaskReviewWorkflowCommand(
      {
        ...makeSystemReviewActionContext('organization-admin-1'),
        organizationId: 'organization-1',
      },
      actorAccess,
      workflows as ReviewTaskWorkflowUnitOfWork
    ).execute({ workflowId: 'workflow-1' })

    assert.equal(finalizationSource, 'organization_governance')
  })
})
