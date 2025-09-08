import { test } from '@japa/runner'

import { ErrorMessages } from '#constants/error_constants'
import { buildSubmitSkillReviewDTO } from '#controllers/reviews/mappers/request/review_request_mapper'
import {
  mapCreateReviewSessionApiBody,
  mapFlaggedReviewsPageProps,
  mapMyReviewsPageProps,
  mapPendingReviewsPageProps,
  mapReviewDataApiBody,
  mapReviewEvidenceCollectionApiBody,
  mapShowReviewPageProps,
  mapTaskSelfAssessmentApiBody,
  mapUserReviewsPageProps,
} from '#controllers/reviews/mappers/response/review_response_mapper'
import BusinessLogicException from '#exceptions/business_logic_exception'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Review controller mappers', () => {
  test('review page mappers serialize controller results into stable page props', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'session-1', status: 'completed' })],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }

    assert.deepEqual(mapMyReviewsPageProps(result), {
      reviews: [{ id: 'session-1', status: 'completed' }],
      meta: result.meta,
    })
    assert.deepEqual(mapUserReviewsPageProps(result, 'user-1'), {
      userId: 'user-1',
      reviews: [{ id: 'session-1', status: 'completed' }],
      meta: result.meta,
    })
    assert.deepEqual(mapPendingReviewsPageProps(result), {
      reviews: [{ id: 'session-1', status: 'completed' }],
      meta: result.meta,
    })
    assert.deepEqual(
      mapShowReviewPageProps(
        serializable({ id: 'session-1', manager_review_completed: true }),
        [{ id: 'skill-1', skill_name: 'TypeScript' }],
        ['junior', 'senior']
      ),
      {
        session: { id: 'session-1', manager_review_completed: true },
        skills: [{ id: 'skill-1', skill_name: 'TypeScript' }],
        proficiencyLevels: ['junior', 'senior'],
      }
    )
    assert.deepEqual(
      mapFlaggedReviewsPageProps(
        {
          data: [serializable({ id: 'flag-1', status: 'pending' })],
          meta: result.meta,
        },
        ['pending', 'dismissed'],
        'pending'
      ),
      {
        flaggedReviews: [{ id: 'flag-1', status: 'pending' }],
        meta: result.meta,
        statuses: ['pending', 'dismissed'],
        currentStatus: 'pending',
      }
    )
  })

  test('review api mappers serialize model payloads and preserve response envelopes', ({
    assert,
  }) => {
    assert.deepEqual(mapCreateReviewSessionApiBody(serializable({ id: 'session-1' })), {
      success: true,
      data: { id: 'session-1' },
    })
    assert.deepEqual(mapReviewDataApiBody(serializable({ id: 'evidence-1' })), {
      success: true,
      data: { id: 'evidence-1' },
    })
    assert.deepEqual(
      mapReviewEvidenceCollectionApiBody([
        serializable({ id: 'evidence-1' }),
        { id: 'evidence-2' },
      ]),
      {
        success: true,
        data: [{ id: 'evidence-1' }, { id: 'evidence-2' }],
      }
    )
    assert.deepEqual(mapTaskSelfAssessmentApiBody(serializable({ id: 'assessment-1' })), {
      success: true,
      data: { id: 'assessment-1' },
    })
    assert.deepEqual(mapTaskSelfAssessmentApiBody(null), {
      success: true,
      data: null,
    })
  })

  test('submit review request mapper rejects malformed skill ratings with business exceptions', ({
    assert,
  }) => {
    const request = fakeRequest({
      reviewer_type: 'manager',
      skill_ratings: [{ skill_id: 'skill-1' }],
    })

    try {
      buildSubmitSkillReviewDTO(request as never, 'session-1')
      assert.fail('Expected buildSubmitSkillReviewDTO to reject malformed skill_ratings')
    } catch (error) {
      assert.instanceOf(error, BusinessLogicException)
      assert.equal((error as BusinessLogicException).message, ErrorMessages.INVALID_INPUT)
    }

    const dto = buildSubmitSkillReviewDTO(
      fakeRequest({
        reviewer_type: 'peer',
        skill_ratings: [
          {
            skill_id: 'skill-1',
            level_code: 'senior',
            comment: 'Strong delivery',
          },
        ],
        overall_quality_score: '5',
        would_work_with_again: 'true',
      }) as never,
      'session-2'
    )

    assert.equal(dto.review_session_id, 'session-2')
    assert.equal(dto.reviewer_type, 'peer')
    assert.deepEqual(dto.skill_ratings, [
      {
        skill_id: 'skill-1',
        assigned_level_code: 'senior',
        comment: 'Strong delivery',
      },
    ])
    assert.equal(dto.overall_quality_score, 5)
    assert.isTrue(dto.would_work_with_again)
  })
})
