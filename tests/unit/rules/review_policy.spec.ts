import { test } from '@japa/runner'

import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import {
  canCreateReviewSession,
  canConfirmReview,
  resolveConfirmationCounters,
} from '#modules/reviews/domain/review_policy'
import { AssignmentStatus } from '#modules/tasks/constants/task_constants'

test.group('Review policy', () => {
  test('review sessions only open for completed assignments and completion check wins over duplicate state', ({
    assert,
  }) => {
    assert.isTrue(
      canCreateReviewSession({
        assignmentStatus: AssignmentStatus.COMPLETED,
        existingSessionId: null,
      }).allowed
    )

    const activeAssignment = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.ACTIVE,
      existingSessionId: null,
    })
    const duplicate = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.COMPLETED,
      existingSessionId: 'session-001',
    })
    const precedence = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.ACTIVE,
      existingSessionId: 'session-001',
    })

    assert.isFalse(activeAssignment.allowed)
    assert.isFalse(duplicate.allowed)
    assert.isFalse(precedence.allowed)
    if (!activeAssignment.allowed) {
      assert.include(activeAssignment.reason, 'hoàn thành')
    }
    if (!duplicate.allowed) {
      assert.include(duplicate.reason, 'đã tồn tại')
    }
    if (!precedence.allowed) {
      assert.include(precedence.reason, 'hoàn thành')
    }
  })

  test('completed or disputed sessions stay confirmable for the reviewee until they act once', ({
    assert,
  }) => {
    for (const sessionStatus of [ReviewSessionStatus.COMPLETED, ReviewSessionStatus.DISPUTED]) {
      assert.isTrue(
        canConfirmReview({
          sessionStatus,
          sessionRevieweeId: 'user-001',
          actorId: 'user-001',
          existingConfirmationUserIds: ['user-002'],
        }).allowed
      )
    }

    const unfinished = canConfirmReview({
      sessionStatus: ReviewSessionStatus.PENDING,
      sessionRevieweeId: 'user-001',
      actorId: 'user-999',
      existingConfirmationUserIds: ['user-999'],
    })

    assert.isFalse(unfinished.allowed)
    if (!unfinished.allowed) {
      assert.equal(unfinished.code, 'BUSINESS_RULE')
      assert.include(unfinished.reason, 'hoàn thành')
    }
  })

  test('confirmation rejects wrong actors and duplicate reviewee actions', ({ assert }) => {
    const wrongActor = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-002',
      existingConfirmationUserIds: [],
    })
    const duplicate = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: ['user-001'],
    })

    assert.isFalse(wrongActor.allowed)
    assert.isFalse(duplicate.allowed)
    if (!wrongActor.allowed) {
      assert.include(wrongActor.reason, 'được đánh giá')
    }
    if (!duplicate.allowed) {
      assert.equal(duplicate.code, 'BUSINESS_RULE')
      assert.include(duplicate.reason, 'đã xác nhận')
    }
    assert.deepEqual(
      resolveConfirmationCounters('confirmed', {
        accurate: 5,
        disputed: 2,
        total: 7,
      }),
      { accurate: 6, disputed: 2, total: 8 }
    )
    assert.deepEqual(
      resolveConfirmationCounters('disputed', {
        accurate: 0,
        disputed: 0,
        total: 0,
      }),
      { accurate: 0, disputed: 1, total: 1 }
    )
  })
})
