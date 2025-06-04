import { test } from '@japa/runner'
import {
  CreateReviewSessionDTO,
  SubmitSkillReviewDTO,
  ConfirmReviewDTO,
  SubmitReverseReviewDTO,
  GetReviewSessionDTO,
  GetUserReviewsDTO,
} from '#actions/reviews/dtos/review_dtos'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// CreateReviewSessionDTO
// ============================================================================
test.group('CreateReviewSessionDTO', () => {
  test('creates with required fields', ({ assert }) => {
    const dto = new CreateReviewSessionDTO({
      task_assignment_id: VALID_UUID,
      reviewee_id: VALID_UUID_2,
    })
    assert.equal(dto.task_assignment_id, VALID_UUID)
    assert.equal(dto.reviewee_id, VALID_UUID_2)
    assert.equal(dto.required_peer_reviews, 2) // default
  })

  test('creates with custom peer reviews count', ({ assert }) => {
    const dto = new CreateReviewSessionDTO({
      task_assignment_id: VALID_UUID,
      reviewee_id: VALID_UUID_2,
      required_peer_reviews: 3,
    })
    assert.equal(dto.required_peer_reviews, 3)
  })

  test('throws for missing task_assignment_id', ({ assert }) => {
    assert.throws(
      () => new CreateReviewSessionDTO({ reviewee_id: VALID_UUID_2 }),
      /task_assignment_id/
    )
  })

  test('throws for missing reviewee_id', ({ assert }) => {
    assert.throws(
      () => new CreateReviewSessionDTO({ task_assignment_id: VALID_UUID }),
      /reviewee_id/
    )
  })
})

// ============================================================================
// SubmitSkillReviewDTO
// ============================================================================
test.group('SubmitSkillReviewDTO', () => {
  test('creates with required fields', ({ assert }) => {
    const dto = new SubmitSkillReviewDTO({
      review_session_id: VALID_UUID,
      reviewer_type: 'manager',
    })
    assert.equal(dto.review_session_id, VALID_UUID)
    assert.equal(dto.reviewer_type, 'manager')
    assert.deepEqual(dto.skill_ratings, [])
  })

  test('creates with skill ratings', ({ assert }) => {
    const ratings = [{ skill_id: VALID_UUID, assigned_level_code: 'advanced', comment: 'Good' }]
    const dto = new SubmitSkillReviewDTO({
      review_session_id: VALID_UUID,
      reviewer_type: 'peer',
      skill_ratings: ratings,
    })
    assert.equal(dto.skill_ratings.length, 1)
    assert.equal(dto.skill_ratings[0]!.assigned_level_code, 'advanced')
  })

  test('throws for missing review_session_id', ({ assert }) => {
    assert.throws(() => new SubmitSkillReviewDTO({ reviewer_type: 'manager' }), /review_session_id/)
  })

  test('throws for missing reviewer_type', ({ assert }) => {
    assert.throws(
      () => new SubmitSkillReviewDTO({ review_session_id: VALID_UUID }),
      /reviewer_type/
    )
  })
})

// ============================================================================
// ConfirmReviewDTO
// ============================================================================
test.group('ConfirmReviewDTO', () => {
  test('creates confirmed review', ({ assert }) => {
    const dto = new ConfirmReviewDTO({
      review_session_id: VALID_UUID,
      action: 'confirmed',
    })
    assert.equal(dto.action, 'confirmed')
    assert.isNull(dto.dispute_reason)
  })

  test('creates disputed review with reason', ({ assert }) => {
    const dto = new ConfirmReviewDTO({
      review_session_id: VALID_UUID,
      action: 'disputed',
      dispute_reason: 'Rating is unfair',
    })
    assert.equal(dto.action, 'disputed')
    assert.equal(dto.dispute_reason, 'Rating is unfair')
  })

  test('throws for missing review_session_id', ({ assert }) => {
    assert.throws(() => new ConfirmReviewDTO({ action: 'confirmed' }), /review_session_id/)
  })

  test('throws for missing action', ({ assert }) => {
    assert.throws(() => new ConfirmReviewDTO({ review_session_id: VALID_UUID }), /action/)
  })
})

// ============================================================================
// SubmitReverseReviewDTO
// ============================================================================
test.group('SubmitReverseReviewDTO', () => {
  test('creates with all required fields', ({ assert }) => {
    const dto = new SubmitReverseReviewDTO({
      review_session_id: VALID_UUID,
      target_type: 'peer',
      target_id: VALID_UUID_2,
      rating: 4,
    })
    assert.equal(dto.target_type, 'peer')
    assert.equal(dto.rating, 4)
    assert.isNull(dto.comment)
    assert.isFalse(dto.is_anonymous)
  })

  test('creates with optional fields', ({ assert }) => {
    const dto = new SubmitReverseReviewDTO({
      review_session_id: VALID_UUID,
      target_type: 'manager',
      target_id: VALID_UUID_2,
      rating: 5,
      comment: 'Great mentor',
      is_anonymous: true,
    })
    assert.equal(dto.comment, 'Great mentor')
    assert.isTrue(dto.is_anonymous)
  })

  test('throws for missing review_session_id', ({ assert }) => {
    assert.throws(
      () =>
        new SubmitReverseReviewDTO({
          target_type: 'peer',
          target_id: VALID_UUID_2,
          rating: 4,
        }),
      /review_session_id/
    )
  })

  test('throws for missing target_type', ({ assert }) => {
    assert.throws(
      () =>
        new SubmitReverseReviewDTO({
          review_session_id: VALID_UUID,
          target_id: VALID_UUID_2,
          rating: 4,
        }),
      /target_type/
    )
  })

  test('throws for missing target_id', ({ assert }) => {
    assert.throws(
      () =>
        new SubmitReverseReviewDTO({
          review_session_id: VALID_UUID,
          target_type: 'peer',
          rating: 4,
        }),
      /target_id/
    )
  })

  test('throws for missing rating', ({ assert }) => {
    assert.throws(
      () =>
        new SubmitReverseReviewDTO({
          review_session_id: VALID_UUID,
          target_type: 'peer',
          target_id: VALID_UUID_2,
        }),
      /rating/
    )
  })
})

// ============================================================================
// GetReviewSessionDTO
// ============================================================================
test.group('GetReviewSessionDTO', () => {
  test('creates with review session id', ({ assert }) => {
    const dto = new GetReviewSessionDTO(VALID_UUID)
    assert.equal(dto.review_session_id, VALID_UUID)
  })
})

// ============================================================================
// GetUserReviewsDTO
// ============================================================================
test.group('GetUserReviewsDTO', () => {
  test('creates with user id and defaults', ({ assert }) => {
    const dto = new GetUserReviewsDTO({ user_id: VALID_UUID })
    assert.equal(dto.user_id, VALID_UUID)
    assert.equal(dto.page, 1)
    assert.equal(dto.per_page, 20)
  })

  test('creates with custom pagination', ({ assert }) => {
    const dto = new GetUserReviewsDTO({ user_id: VALID_UUID, page: 3, per_page: 50 })
    assert.equal(dto.page, 3)
    assert.equal(dto.per_page, 50)
  })

  test('throws for missing user_id', ({ assert }) => {
    assert.throws(() => new GetUserReviewsDTO({}), /user_id/)
  })
})
