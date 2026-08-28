import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import CreateReviewDisputeCommentController from '#modules/reviews/controllers/disputes/create_review_dispute_comment_controller'
import ListReviewDisputeCommentsController from '#modules/reviews/controllers/disputes/list_review_dispute_comments_controller'

const failure = new ForbiddenException('Review dispute access denied')

function context() {
  return {
    params: { disputeId: 'dispute-1' },
    request: {
      input: (key: string, fallback?: unknown) => {
        if (key === 'body') return 'comment'
        return fallback
      },
      only: () => ({ body: 'comment' }),
      ip: () => '127.0.0.1',
      header: () => null,
    },
    auth: { user: { id: 'user-1', current_organization_id: null } },
    session: { get: () => null },
    currentOrganizationId: null,
    currentOrganizationRole: null,
    response: {
      status: () => undefined,
    },
  }
}

test.group('Unit | Review dispute artifacts Result boundary', () => {
  test('comments list controller unwraps query failures', async ({ assert }) => {
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const factory = { makeListReviewDisputeCommentsQuery: () => query }

    await assert.rejects(
      () =>
        new ListReviewDisputeCommentsController(factory as never).handle(
          context() as never
        ),
      failure.message
    )
  })

  test('comment create controller unwraps command failures', async ({ assert }) => {
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const factory = { makeCreateReviewDisputeCommentCommand: () => command }

    await assert.rejects(
      () =>
        new CreateReviewDisputeCommentController(factory as never).handle(
          context() as never
        ),
      failure.message
    )
  })
})
