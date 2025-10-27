import { test } from '@japa/runner'

import { REVIEW_DEFAULTS } from '#modules/reviews/constants/review_constants'
import {
  SPRINT_REVERSE_REVIEW_STATUSES,
  emptySprintReverseReviewBoardSection,
} from '#modules/reviews/domain/sprint_reverse_review_workflow'
import {
  TASK_REVIEW_BOARD_COLUMNS,
  TASK_REVIEW_WORKFLOW_STATUSES,
  emptyTaskReviewBoardColumns,
} from '#modules/reviews/domain/task_review_workflow'

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
      TASK_REVIEW_WORKFLOW_STATUSES.DONE,
    ])
    assert.sameDeepMembers(
      TASK_REVIEW_BOARD_COLUMNS.map((column) => column.label),
      ['Chờ review', 'Đang review', 'Chờ phản hồi', 'Tranh chấp', 'Đã gửi report tranh chấp', 'Done']
    )
    assert.isTrue(emptyTaskReviewBoardColumns().every((column) => column.cards.length === 0))
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
      'done',
    ])
    assert.sameMembers(Object.keys(section.columns), [...SPRINT_REVERSE_REVIEW_STATUSES])
    assert.isTrue(Object.values(section.columns).every((column) => column.cards.length === 0))
  })
})
