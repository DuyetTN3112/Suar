import { test } from '@japa/runner'

import {
  fakeRequest,
  VALID_REVIEW_SESSION_ID,
  VALID_SKILL_ID,
} from '../support/review_controller_mappers_test_support.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import {
  buildAddReviewEvidenceDTO,
  buildConfirmReviewDTO,
  buildCreateReviewSessionDTO,
  buildFlaggedReviewsInput,
  buildGetUserReviewsDTO,
  buildPendingReviewsInput,
  buildSubmitSkillReviewDTO,
  buildSubmitReverseReviewDTO,
} from '#modules/reviews/controllers/mappers/request/review-core/review_request_mapper'

test.group('Unit | Review Controller Mappers - Request DTOs', () => {
  test('create review session request mapper accepts camelCase and snake_case inputs', ({
    assert,
  }) => {
    const camelCaseDto = buildCreateReviewSessionDTO(
      fakeRequest({
        taskAssignmentId: 'assignment-1',
        revieweeId: 'user-1',
        requiredPeerReviews: 4,
      }) as never
    )

    assert.equal(camelCaseDto.task_assignment_id, 'assignment-1')
    assert.equal(camelCaseDto.reviewee_id, 'user-1')
    assert.equal(camelCaseDto.required_peer_reviews, 4)

    const snakeCaseDto = buildCreateReviewSessionDTO(
      fakeRequest({
        task_assignment_id: 'assignment-2',
        reviewee_id: 'user-2',
        required_peer_reviews: 3,
      }) as never
    )

    assert.equal(snakeCaseDto.task_assignment_id, 'assignment-2')
    assert.equal(snakeCaseDto.reviewee_id, 'user-2')
    assert.equal(snakeCaseDto.required_peer_reviews, 3)
  })

  test('review list request mappers normalize shared pagination and preserve cursor filters', ({
    assert,
  }) => {
    const userReviewsDto = buildGetUserReviewsDTO(
      fakeRequest({
        page: '0',
        per_page: '999',
      }) as never,
      'user-1'
    )
    const pendingInput = buildPendingReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
      }) as never
    )
    const pendingCursorInput = buildPendingReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
        after: 'cursor-older',
        before: 'cursor-newer',
      }) as never
    )
    const flaggedInput = buildFlaggedReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
        after: 'cursor-older',
        before: 'cursor-newer',
        status: 'pending',
      }) as never
    )

    assert.equal(userReviewsDto.user_id, 'user-1')
    assert.equal(userReviewsDto.page, 1)
    assert.equal(userReviewsDto.per_page, 100)
    assert.deepEqual(pendingInput, {
      page: 1,
      per_page: 100,
    })
    assert.deepEqual(pendingCursorInput, {
      page: 1,
      per_page: 100,
      after: 'cursor-older',
      before: 'cursor-newer',
    })
    assert.deepEqual(flaggedInput, {
      page: 1,
      per_page: 100,
      after: 'cursor-older',
      before: 'cursor-newer',
      status: 'pending',
    })
  })

  test('review list request mappers accept camelCase perPage alias', ({ assert }) => {
    const userReviewsDto = buildGetUserReviewsDTO(
      fakeRequest({
        page: '2',
        perPage: '25',
      }) as never,
      'user-1'
    )
    const pendingInput = buildPendingReviewsInput(
      fakeRequest({
        page: '3',
        perPage: '40',
      }) as never
    )
    const flaggedInput = buildFlaggedReviewsInput(
      fakeRequest({
        page: '4',
        perPage: '50',
        status: 'resolved',
      }) as never
    )

    assert.equal(userReviewsDto.page, 2)
    assert.equal(userReviewsDto.per_page, 25)
    assert.deepEqual(pendingInput, {
      page: 3,
      per_page: 40,
    })
    assert.deepEqual(flaggedInput, {
      page: 4,
      per_page: 50,
      status: 'resolved',
    })
  })

  test('confirm review request mapper accepts camelCase and snake_case dispute reason', ({
    assert,
  }) => {
    const camelCaseDto = buildConfirmReviewDTO(
      fakeRequest({
        action: 'disputed',
        disputeReason: 'Need second opinion',
      }) as never,
      'session-1'
    )

    assert.equal(camelCaseDto.review_session_id, 'session-1')
    assert.equal(camelCaseDto.action, 'disputed')
    assert.equal(camelCaseDto.dispute_reason, 'Need second opinion')

    const snakeCaseDto = buildConfirmReviewDTO(
      fakeRequest({
        action: 'disputed',
        dispute_reason: 'Need escalation',
      }) as never,
      'session-2'
    )

    assert.equal(snakeCaseDto.review_session_id, 'session-2')
    assert.equal(snakeCaseDto.action, 'disputed')
    assert.equal(snakeCaseDto.dispute_reason, 'Need escalation')
  })

  test('review evidence and reverse review request mappers accept camelCase', ({
    assert,
  }) => {
    const evidenceDto = buildAddReviewEvidenceDTO(
      fakeRequest({
        evidenceType: 'document_link',
        url: 'https://example.com',
        title: 'Spec doc',
        description: 'Support',
      }) as never,
      'session-1'
    )
    assert.equal(evidenceDto.review_session_id, 'session-1')
    assert.equal(evidenceDto.evidence_type, 'document_link')

    const reverseDto = buildSubmitReverseReviewDTO(
      fakeRequest({
        targetType: 'manager',
        targetId: 'manager-1',
        rating: 5,
        comment: 'Great support',
        isAnonymous: true,
      }) as never,
      'session-2'
    )
    assert.equal(reverseDto.review_session_id, 'session-2')
    assert.equal(reverseDto.target_type, 'manager')
    assert.equal(reverseDto.target_id, 'manager-1')
    assert.equal(reverseDto.rating, 5)
    assert.isTrue(reverseDto.is_anonymous)
  })

  test('submit review request mapper rejects malformed skill ratings with business exceptions', ({
    assert,
  }) => {
    const request = fakeRequest({
      reviewer_type: 'manager',
      skill_ratings: [{ skill_id: VALID_SKILL_ID }],
    })

    try {
      buildSubmitSkillReviewDTO(request as never, VALID_REVIEW_SESSION_ID)
      assert.fail('Expected buildSubmitSkillReviewDTO to reject malformed skill_ratings')
    } catch (error) {
      assert.instanceOf(error, BusinessLogicException)
      assert.equal((error as BusinessLogicException).message, ErrorMessages.INVALID_INPUT)
    }

    const dto = buildSubmitSkillReviewDTO(
      fakeRequest({
        reviewerType: 'peer',
        skillRatings: [
          {
            skillId: VALID_SKILL_ID,
            levelCode: 'l10',
            comment: 'Strong delivery',
            insufficientEvidence: true,
          },
        ],
        overallQualityScore: '5',
        wouldWorkWithAgain: true,
      }) as never,
      VALID_REVIEW_SESSION_ID
    )

    assert.equal(dto.review_session_id, VALID_REVIEW_SESSION_ID)
    assert.equal(dto.reviewer_type, 'peer')
    assert.deepEqual(dto.skill_ratings, [
      {
        skill_id: VALID_SKILL_ID,
        assigned_public_proficiency_code: 'l10',
        comment: 'Strong delivery',
        insufficient_evidence: true,
        confidence: null,
        observable_behaviors: [],
        evidence_ids: [],
      },
    ])
    assert.equal(dto.overall_quality_score, 5)
    assert.isTrue(dto.would_work_with_again)

    assert.throws(
      () =>
        buildSubmitSkillReviewDTO(
          fakeRequest({
            reviewerType: 'peer',
            skillRatings: [
              {
                skillId: VALID_SKILL_ID,
                levelCode: 'senior',
              },
            ],
          }) as never,
          VALID_REVIEW_SESSION_ID
        ),
      /canonical code \(l0-l14\)/
    )

    assert.throws(
      () =>
        buildSubmitSkillReviewDTO(
          fakeRequest({
            reviewerType: 'peer',
            skillRatings: [
              {
                skillId: VALID_SKILL_ID,
                levelCode: 'l4',
                evidenceIds: ['evidence-1', 42],
              },
            ],
          }) as never,
          VALID_REVIEW_SESSION_ID
        ),
      ErrorMessages.INVALID_INPUT
    )
  })
})
