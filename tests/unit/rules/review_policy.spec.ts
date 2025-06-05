import { test } from '@japa/runner'
import {
  canCreateReviewSession,
  canConfirmReview,
  resolveConfirmationCounters,
} from '#domain/reviews/review_policy'
import { AssignmentStatus } from '#constants/task_constants'
import { ReviewSessionStatus } from '#constants/review_constants'

// ============================================================================
// canCreateReviewSession
// ============================================================================

test.group('canCreateReviewSession', () => {
  test('allowed: completed assignment, no existing session', ({ assert }) => {
    const result = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.COMPLETED,
      existingSessionId: null,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: assignment not completed (active)', ({ assert }) => {
    const result = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.ACTIVE,
      existingSessionId: null,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: assignment not completed (cancelled)', ({ assert }) => {
    const result = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.CANCELLED,
      existingSessionId: null,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: session already exists', ({ assert }) => {
    const result = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.COMPLETED,
      existingSessionId: 'session-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: assignment not completed AND session exists', ({ assert }) => {
    const result = canCreateReviewSession({
      assignmentStatus: AssignmentStatus.ACTIVE,
      existingSessionId: 'session-001',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      // Status check fires first
      assert.include(result.reason, 'hoàn thành')
    }
  })
})

// ============================================================================
// canConfirmReview
// ============================================================================

test.group('canConfirmReview', () => {
  test('allowed: completed session, actor is reviewee, not yet confirmed', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: [],
    })
    assert.isTrue(result.allowed)
  })

  test('allowed: disputed session, actor is reviewee', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.DISPUTED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: [],
    })
    assert.isTrue(result.allowed)
  })

  test('denied: session is pending', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.PENDING,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: [],
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: session is in_progress', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.IN_PROGRESS,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: [],
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: actor is not the reviewee', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-002',
      existingConfirmationUserIds: [],
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.include(result.reason, 'được đánh giá')
  })

  test('denied: already confirmed', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: ['user-001'],
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('allowed: other users confirmed but not me', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.COMPLETED,
      sessionRevieweeId: 'user-001',
      actorId: 'user-001',
      existingConfirmationUserIds: ['user-002', 'user-003'],
    })
    assert.isTrue(result.allowed)
  })

  test('priority: status check fires before identity check', ({ assert }) => {
    const result = canConfirmReview({
      sessionStatus: ReviewSessionStatus.PENDING,
      sessionRevieweeId: 'user-001',
      actorId: 'user-999',
      existingConfirmationUserIds: ['user-999'],
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.include(result.reason, 'hoàn thành')
    }
  })
})

// ============================================================================
// resolveConfirmationCounters
// ============================================================================

test.group('resolveConfirmationCounters', () => {
  test('confirmed increments accurate and total', ({ assert }) => {
    const result = resolveConfirmationCounters('confirmed', {
      accurate: 5,
      disputed: 2,
      total: 7,
    })
    assert.deepEqual(result, { accurate: 6, disputed: 2, total: 8 })
  })

  test('disputed increments disputed and total', ({ assert }) => {
    const result = resolveConfirmationCounters('disputed', {
      accurate: 5,
      disputed: 2,
      total: 7,
    })
    assert.deepEqual(result, { accurate: 5, disputed: 3, total: 8 })
  })

  test('confirmed from zero counters', ({ assert }) => {
    const result = resolveConfirmationCounters('confirmed', {
      accurate: 0,
      disputed: 0,
      total: 0,
    })
    assert.deepEqual(result, { accurate: 1, disputed: 0, total: 1 })
  })

  test('disputed from zero counters', ({ assert }) => {
    const result = resolveConfirmationCounters('disputed', {
      accurate: 0,
      disputed: 0,
      total: 0,
    })
    assert.deepEqual(result, { accurate: 0, disputed: 1, total: 1 })
  })

  test('confirmed does not change disputed count', ({ assert }) => {
    const before = { accurate: 10, disputed: 3, total: 13 }
    const after = resolveConfirmationCounters('confirmed', before)
    assert.equal(after.disputed, before.disputed)
  })

  test('disputed does not change accurate count', ({ assert }) => {
    const before = { accurate: 10, disputed: 3, total: 13 }
    const after = resolveConfirmationCounters('disputed', before)
    assert.equal(after.accurate, before.accurate)
  })
})
