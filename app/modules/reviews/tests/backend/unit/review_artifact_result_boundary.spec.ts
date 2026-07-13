import { test } from '@japa/runner'

import AddReviewEvidenceCommand from '#modules/reviews/actions/commands/review-submission/add_review_evidence_command'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/self-assessment/upsert_task_self_assessment_command'
import type { ReviewSessionArtifactUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_artifact_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

const anonymousContext: ReviewActionContext = {
  userId: null,
  ip: '',
  userAgent: '',
  organizationId: null,
}

const artifactUnitOfWork: ReviewSessionArtifactUnitOfWork = {
  run: () => Promise.reject(new Error('artifact persistence should not run')),
}

test.group('Unit | Review artifact Result boundary', () => {
  test('wraps add-review-evidence authorization failures', async ({ assert }) => {
    const result = await new AddReviewEvidenceCommand(anonymousContext, artifactUnitOfWork).executeAndWrap({
      review_session_id: 'review-session-1',
      evidence_type: 'document_link',
      url: null,
      title: null,
      description: null,
    })

    assert.isTrue(result.isFailure())
    const error = result.getError()
    assert.equal(error.code, 'E_UNAUTHORIZED')
  })

  test('wraps self-assessment authorization failures', async ({ assert }) => {
    const result = await new UpsertTaskSelfAssessmentCommand(
      anonymousContext,
      artifactUnitOfWork
    ).executeAndWrap({
      review_session_id: 'review-session-1',
      overall_satisfaction: null,
      difficulty_felt: null,
      confidence_level: null,
      what_went_well: null,
      what_would_do_different: null,
      blockers_encountered: [],
      skills_felt_lacking: [],
      skills_felt_strong: [],
    })

    assert.isTrue(result.isFailure())
    const error = result.getError()
    assert.equal(error.code, 'E_UNAUTHORIZED')
  })
})
