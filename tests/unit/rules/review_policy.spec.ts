import { test } from '@japa/runner'

import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import {
  canCreateReviewSession,
  canConfirmReview,
  resolveConfirmationCounters,
  canAccessReviewSessionAsActor,
  canSubmitReview,
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

test.group('Review policy — actor-aware session access', () => {
  test('system admin can access any review session', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'admin-001',
      actorSystemRole: 'system_admin',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('reviewee can access their own review session', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'user-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('manager reviewer can access review session', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'manager-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: ['manager-001'],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('peer reviewer can access review session', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'peer-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: ['peer-001'],
      isOrgAdminOrOwner: false,
    })
    assert.isTrue(result.allowed)
  })

  test('org admin can access review session in their org', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'org-admin-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: true,
    })
    assert.isTrue(result.allowed)
  })

  test('unrelated user cannot access review session', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: true,
      actorId: 'outsider-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
    })
    assert.isFalse(result.allowed)
  })

  test('non-existent session is denied for everyone', ({ assert }) => {
    const result = canAccessReviewSessionAsActor({
      sessionExists: false,
      actorId: 'admin-001',
      actorSystemRole: 'system_admin',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
    })
    assert.isFalse(result.allowed)
  })
})

test.group('Review policy — submit review authorization', () => {
  test('manager can submit as manager reviewer type', ({ assert }) => {
    const result = canSubmitReview({
      actorId: 'manager-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: ['manager-001'],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
      reviewerType: 'manager',
    })
    assert.isTrue(result.allowed)
  })

  test('peer can submit as peer reviewer type', ({ assert }) => {
    const result = canSubmitReview({
      actorId: 'peer-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: ['peer-001'],
      isOrgAdminOrOwner: false,
      reviewerType: 'peer',
    })
    assert.isTrue(result.allowed)
  })

  test('unrelated user cannot submit review', ({ assert }) => {
    const result = canSubmitReview({
      actorId: 'outsider-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
      reviewerType: 'peer',
    })
    assert.isFalse(result.allowed)
  })

  test('peer cannot spoof manager reviewer type', ({ assert }) => {
    const result = canSubmitReview({
      actorId: 'peer-001',
      actorSystemRole: 'registered_user',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: ['peer-001'],
      isOrgAdminOrOwner: false,
      reviewerType: 'manager',
    })
    assert.isFalse(result.allowed)
  })

  test('system admin can submit review', ({ assert }) => {
    const result = canSubmitReview({
      actorId: 'admin-001',
      actorSystemRole: 'system_admin',
      sessionRevieweeId: 'user-001',
      sessionTaskOrgId: 'org-001',
      managerReviewerIds: [],
      peerReviewerIds: [],
      isOrgAdminOrOwner: false,
      reviewerType: 'manager',
    })
    assert.isTrue(result.allowed)
  })
})
