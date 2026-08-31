import { test } from '@japa/runner'

import SubmitSkillReviewCommand from '#modules/reviews/actions/commands/review-submission/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'
import type { ReviewSkillReader } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewSubmissionUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_submission_unit_of_work'

test('submit skill review exposes expected application failures through the canonical Result', async ({
  assert,
}) => {
  const skills: ReviewSkillReader = {
    listActiveSkills: () => Promise.resolve([]),
    listSpiderChartSkillIds: () => Promise.resolve([]),
    resolveProficiencyLevelId: () => Promise.resolve(null),
    findSkillsByIds: () => Promise.resolve([]),
  }
  const unitOfWork: ReviewSubmissionUnitOfWork = {
    run: () => Promise.reject(new Error('unit-of-work should not run')),
  }
  const cache: ReviewCachePort = {
    invalidateReview: () => Promise.resolve(),
    invalidatePendingReviews: () => Promise.resolve(),
    invalidateUserReviewData: () => Promise.resolve(),
    invalidateUserProfileReviewData: () => Promise.resolve(),
  }
  const command = new SubmitSkillReviewCommand(
    {
      userId: null,
      ip: '127.0.0.1',
      userAgent: 'unit-test',
      organizationId: null,
    },
    skills,
    unitOfWork,
    cache
  )

  const result = await command.executeAndWrap(
    new SubmitSkillReviewDTO({
      review_session_id: '00000000-0000-4000-8000-000000000001',
      reviewer_type: 'peer',
      skill_ratings: [
        {
          skill_id: '00000000-0000-4000-8000-000000000002',
          assigned_public_proficiency_code: 'l1',
        },
      ],
    })
  )

  assert.isTrue(result.isFailure())
  assert.equal(result.getError().code, 'E_UNAUTHORIZED')
})
