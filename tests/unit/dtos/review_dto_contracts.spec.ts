import { test } from '@japa/runner'
import {
  AddReviewEvidenceDTO,
  ConfirmReviewDTO,
  CreateReviewSessionDTO,
  GetUserReviewsDTO,
  SubmitReverseReviewDTO,
  SubmitSkillReviewDTO,
  UpsertTaskSelfAssessmentDTO,
} from '#actions/reviews/dtos/request/review_dtos'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

test.group('Review DTO contracts', () => {
  test('session, list, confirmation, and reverse-review DTOs keep their default and required-field contracts', ({
    assert,
  }) => {
    const createDto = new CreateReviewSessionDTO({
      task_assignment_id: VALID_UUID,
      reviewee_id: VALID_UUID_2,
    })
    const listDto = new GetUserReviewsDTO({ user_id: VALID_UUID })
    const confirmDto = new ConfirmReviewDTO({
      review_session_id: VALID_UUID,
      action: 'confirmed',
    })
    const reverseDto = new SubmitReverseReviewDTO({
      review_session_id: VALID_UUID,
      target_type: 'peer',
      target_id: VALID_UUID_2,
      rating: 4,
    })

    assert.equal(createDto.required_peer_reviews, 2)
    assert.equal(listDto.page, 1)
    assert.equal(listDto.per_page, 20)
    assert.isNull(confirmDto.dispute_reason)
    assert.isNull(reverseDto.comment)
    assert.isFalse(reverseDto.is_anonymous)

    assert.throws(() => new ConfirmReviewDTO({ action: 'confirmed' }))
    assert.throws(
      () =>
        new SubmitReverseReviewDTO({
          review_session_id: VALID_UUID,
          target_type: 'peer',
          rating: 4,
        })
    )
  })

  test('submit review and evidence DTOs preserve defaults while rejecting malformed payloads', ({
    assert,
  }) => {
    const reviewDto = new SubmitSkillReviewDTO({
      review_session_id: VALID_UUID,
      reviewer_type: 'manager',
      skill_ratings: [
        { skill_id: VALID_UUID_2, assigned_level_code: 'senior', comment: 'Strong ownership' },
      ],
    })
    const evidenceDto = new AddReviewEvidenceDTO({
      review_session_id: VALID_UUID,
      evidence_type: 'pull_request',
      url: 'https://example.com/pr/123',
      title: 'PR 123',
    })

    assert.equal(reviewDto.review_session_id, VALID_UUID)
    assert.equal(reviewDto.reviewer_type, 'manager')
    assert.lengthOf(reviewDto.skill_ratings, 1)
    assert.isNull(reviewDto.overall_quality_score)
    assert.isNull(reviewDto.delivery_timeliness)
    assert.equal(evidenceDto.evidence_type, 'pull_request')
    assert.equal(evidenceDto.url, 'https://example.com/pr/123')
    assert.equal(evidenceDto.title, 'PR 123')

    const invalidFactories = [
      () => new SubmitSkillReviewDTO({ reviewer_type: 'peer' }),
      () => new SubmitSkillReviewDTO({ review_session_id: VALID_UUID }),
      () => new AddReviewEvidenceDTO({ review_session_id: VALID_UUID, evidence_type: '' }),
      () =>
        new AddReviewEvidenceDTO({ review_session_id: VALID_UUID, evidence_type: 'invalid_type' }),
      () =>
        new AddReviewEvidenceDTO({
          review_session_id: VALID_UUID,
          evidence_type: 'pull_request',
          url: 'x'.repeat(601),
        }),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })

  test('self-assessment DTO enforces bounded ratings and valid difficulty labels', ({ assert }) => {
    const dto = new UpsertTaskSelfAssessmentDTO({
      review_session_id: VALID_UUID,
      overall_satisfaction: 4,
      difficulty_felt: 'as_expected',
      confidence_level: 5,
      blockers_encountered: ['scope'],
      skills_felt_lacking: ['testing'],
      skills_felt_strong: ['communication'],
    })

    assert.equal(dto.difficulty_felt, 'as_expected')
    assert.deepEqual(dto.blockers_encountered, ['scope'])
    assert.deepEqual(dto.skills_felt_lacking, ['testing'])
    assert.deepEqual(dto.skills_felt_strong, ['communication'])

    const invalidFactories = [
      () =>
        new UpsertTaskSelfAssessmentDTO({ review_session_id: VALID_UUID, overall_satisfaction: 0 }),
      () => new UpsertTaskSelfAssessmentDTO({ review_session_id: VALID_UUID, confidence_level: 6 }),
      () =>
        new UpsertTaskSelfAssessmentDTO({
          review_session_id: VALID_UUID,
          difficulty_felt: 'unknown',
        }),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })
})
