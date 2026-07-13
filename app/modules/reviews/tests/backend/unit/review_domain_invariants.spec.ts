import { test } from '@japa/runner'

import {
  SPRINT_REVERSE_REVIEW_STATUSES,
  emptySprintReverseReviewBoardSection,
} from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'
import {
  TASK_REVIEW_BOARD_COLUMNS,
  TASK_REVIEW_WORKFLOW_STATUSES,
  emptyTaskReviewBoardColumns,
} from '#modules/reviews/domain/task-review/task_review_workflow'
import { normalizeWorkflowStatus } from '#modules/reviews/infra/repositories/read/task_review_board_queries'
import { REVIEW_DEFAULTS } from '#modules/reviews/public_contracts/review_constants'

test.group('Review domain invariants', () => {
  test('review defaults stay within supported scoring bounds', ({ assert }) => {
    assert.equal(REVIEW_DEFAULTS.MIN_PEER_REVIEWS, 2)
    assert.isAtLeast(REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE, 0)
    assert.isAtMost(
      REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE,
      REVIEW_DEFAULTS.MAX_CREDIBILITY_SCORE
    )
    assert.equal(REVIEW_DEFAULTS.MIN_RATING, 1)
    assert.equal(REVIEW_DEFAULTS.MAX_RATING, 5)
  })

  test('task review board exposes exactly the required workflow columns', ({ assert }) => {
    const statuses = TASK_REVIEW_BOARD_COLUMNS.map((column) => column.status)

    assert.deepEqual(statuses, [
      TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW,
      'in_review',
      TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE,
      TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
      TASK_REVIEW_WORKFLOW_STATUSES.REPORTED,
      TASK_REVIEW_WORKFLOW_STATUSES.ADMIN_REVIEWING,
      TASK_REVIEW_WORKFLOW_STATUSES.RESOLVED,
      TASK_REVIEW_WORKFLOW_STATUSES.DONE,
    ])
    assert.sameDeepMembers(
      TASK_REVIEW_BOARD_COLUMNS.map((column) => column.label),
      [
        'Chờ review',
        'Đang review',
        'Chờ phản hồi',
        'Tranh chấp',
        'Đã gửi report tranh chấp',
        'Chờ admin quyết định',
        'Đã xử lý',
        'Done',
      ]
    )
    assert.isTrue(emptyTaskReviewBoardColumns().every((column) => column.cards.length === 0))
  })

  test('task review board keeps missing and unknown workflow statuses distinct', ({ assert }) => {
    assert.equal(normalizeWorkflowStatus(null), 'not_opened')
    assert.equal(normalizeWorkflowStatus(''), 'not_opened')
    assert.equal(normalizeWorkflowStatus('reviewed'), TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW)
    assert.equal(normalizeWorkflowStatus(TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW), TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW)
    assert.equal(normalizeWorkflowStatus('future_status'), 'out_of_model')
  })

  test('sprint reverse review board exposes assigner and environment status columns', ({
    assert,
  }) => {
    const section = emptySprintReverseReviewBoardSection()

    assert.deepEqual(SPRINT_REVERSE_REVIEW_STATUSES, [
      'awaiting_review',
      'in_review',
      'awaiting_response',
      'disputed',
      'reported',
      'ai_reviewing',
      'admin_reviewing',
      'resolved',
      'done',
    ])
    assert.sameMembers(Object.keys(section.columns), [...SPRINT_REVERSE_REVIEW_STATUSES])
    assert.isTrue(Object.values(section.columns).every((column) => column.cards.length === 0))
  })
})
