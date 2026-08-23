import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCreateTaskCommentRequest,
  buildDeleteTaskCommentRequest,
  buildTaskCommentMutationRouteRequest,
  buildUpdateTaskCommentRequest,
} from '#modules/tasks/controllers/mappers/request/task-comments/task_comment_request_mapper'

function requestFrom(input: Record<string, unknown>) {
  return { input: (key: string) => input[key] }
}


test.group('', () => {
  test('maps valid create input and camelCase aliases', ({ assert }) => {
    assert.deepEqual(
      buildCreateTaskCommentRequest(
        requestFrom({
          body: '  Need a review  ',
          parent_comment_id: null,
          commentType: 'review_note',
          visibility: 'reviewers_only',
          review_relevance: true,
        }),
        { taskId: ' task-1 ' }
      ),
      {
        task_id: 'task-1',
        parent_comment_id: null,
        body: 'Need a review',
        comment_type: 'review_note',
        visibility: 'reviewers_only',
        review_relevance: true,
      }
    )
  })

  test('rejects malformed route, body, enum and boolean values', ({ assert }) => {
    assert.throws(
      () =>
        buildCreateTaskCommentRequest(
          requestFrom({ body: 42, commentType: 'system', reviewRelevance: 'true' }),
          { taskId: 42 }
        ),
      ValidationException
    )
  })

  test('maps update and delete route DTOs without unsafe casts at the controller boundary', ({ assert }) => {
    assert.deepEqual(
      buildUpdateTaskCommentRequest(requestFrom({ body: 'edited', visibility: 'public' }), {
        taskId: 'task-1',
        commentId: 'comment-1',
      }),
      {
        task_id: 'task-1',
        comment_id: 'comment-1',
        body: 'edited',
        visibility: 'public',
      }
    )
    assert.deepEqual(buildDeleteTaskCommentRequest({ taskId: 'task-1', commentId: 'comment-1' }), {
      comment_id: 'comment-1',
    })
    assert.throws(() => buildTaskCommentMutationRouteRequest({ taskId: 'task-1' }), ValidationException)
  })


})
