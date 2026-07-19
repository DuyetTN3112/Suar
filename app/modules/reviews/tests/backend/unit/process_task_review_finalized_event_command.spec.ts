import { test } from '@japa/runner'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import ProcessTaskReviewFinalizedEventCommand from '#modules/reviews/actions/commands/task-review/process_task_review_finalized_event_command'
import type { TaskReviewFinalizationSourceReader } from '#modules/reviews/actions/commands/task-review/process_task_review_finalized_event_command'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewTransactionRunner } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewUserWorkHistoryCacheInvalidator } from '#modules/reviews/actions/ports/outbound/review_user_work_history_cache_invalidator'

const event = {
  workflowId: 'workflow-1',
  taskAssignmentId: 'assignment-1',
  taskId: 'task-1',
  revieweeId: 'reviewee-1',
  finalizedBy: 'admin-1',
  finalizationSource: 'admin_resolution' as const,
  finalizedAt: '2026-08-13T05:00:00.000Z',
}

const transactions: ReviewTransactionRunner = {
  run: (work) => work({}),
}

test.group('Unit | Process task review finalized event', () => {
  test('refreshes aggregates only after the persisted workflow is authoritatively done', async ({
    assert,
  }) => {
    const refreshes: Array<{ userId: string; actorId: string | null }> = []
    const invalidatedUserIds: string[] = []
    const user: Pick<ReviewExternalDependencies['user'], 'refreshProfileAggregates'> = {
      refreshProfileAggregates: async (userId, execCtx) => {
        await Promise.resolve()
          refreshes.push({ userId, actorId: execCtx.userId })
      },
    }
    const dependencies: Pick<ReviewExternalDependencies, 'user'> = {
      user: user as ReviewExternalDependencies['user'],
    }
    const sources: TaskReviewFinalizationSourceReader = {
      findFinalizedTaskReviewWorkflow: async () => {
        await Promise.resolve()
        return {
          id: event.workflowId,
          status: 'done',
          taskAssignmentId: event.taskAssignmentId,
          taskId: event.taskId,
          revieweeId: event.revieweeId,
          completedAt: new Date(event.finalizedAt),
        }
      },
    }

    const cache: ReviewUserWorkHistoryCacheInvalidator = {
      invalidateUserWorkHistory: async (userId) => {
        invalidatedUserIds.push(userId)
      },
    }

    await new ProcessTaskReviewFinalizedEventCommand(dependencies, transactions, sources, cache).handle(event)

    assert.deepEqual(refreshes, [{ userId: 'reviewee-1', actorId: 'admin-1' }])
    assert.deepEqual(invalidatedUserIds, ['reviewee-1'])
  })

  test('rejects a stale resolved workflow and makes no profile change', async ({ assert }) => {
    let refreshed = false
    const user: Pick<ReviewExternalDependencies['user'], 'refreshProfileAggregates'> = {
      refreshProfileAggregates: async () => {
        await Promise.resolve()
          refreshed = true
      },
    }
    const dependencies: Pick<ReviewExternalDependencies, 'user'> = {
      user: user as ReviewExternalDependencies['user'],
    }
    const sources: TaskReviewFinalizationSourceReader = {
      findFinalizedTaskReviewWorkflow: async () => {
        await Promise.resolve()
        return {
          id: event.workflowId,
          status: 'resolved',
          taskAssignmentId: event.taskAssignmentId,
          taskId: event.taskId,
          revieweeId: event.revieweeId,
          completedAt: null,
        }
      },
    }
    let cacheInvalidated = false
    const cache: ReviewUserWorkHistoryCacheInvalidator = {
      invalidateUserWorkHistory: async () => {
        cacheInvalidated = true
      },
    }

    await assert.rejects(
      () => new ProcessTaskReviewFinalizedEventCommand(dependencies, transactions, sources, cache).handle(event),
      InvariantViolationException
    )
    assert.isFalse(refreshed)
    assert.isFalse(cacheInvalidated)
  })
})
