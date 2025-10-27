import { test } from '@japa/runner'

import { evaluateReviewDisputeReadiness } from '#modules/reviews/domain/review_dispute_readiness'

test.group('Review dispute readiness', () => {
  const completeInput = {
    taskSnapshot: { id: 'task-1' },
    assignmentSnapshot: { id: 'assignment-1' },
    submissionSnapshot: { id: 'submission-1' },
    reviewSnapshot: { id: 'review-session-1' },
    skillReviewsSnapshot: [{ id: 'skill-review-1' }],
    disputeClaimSnapshot: {
      dispute_reason: 'Review does not reflect evidence',
      requested_outcome: 'adjust_score',
      dispute_comments: [
        {
          author_context: 'reviewee',
          body: 'Please review the pull request again.',
        },
        {
          author_context: 'reviewer',
          body: 'I checked the evidence and still disagree.',
        },
      ],
    },
    taskCommentsSnapshot: [{ id: 'comment-1' }],
    evidencesSnapshot: [{ id: 'evidence-1' }],
    selfAssessmentSnapshot: { summary: 'I met the criteria' },
    taskHistorySnapshot: [{ id: 'history-1' }],
    reviewerContextSnapshot: { reviewer_id: 'reviewer-1' },
    revieweeProfileContextSnapshot: { reviewee_id: 'reviewee-1' },
    overrideReadiness: false,
    overrideReason: null,
  }

  test('complete required data allows normal resolution', ({ assert }) => {
    const result = evaluateReviewDisputeReadiness(completeInput)

    assert.isTrue(result.readyForNormalResolution)
    assert.deepEqual(result.missingRequired, [])
    assert.deepEqual(result.warningRecipients, [])
  })

  test('missing task snapshot blocks normal resolution and warns all parties', ({ assert }) => {
    const result = evaluateReviewDisputeReadiness({
      ...completeInput,
      taskSnapshot: null,
    })

    assert.isFalse(result.readyForNormalResolution)
    assert.include(result.missingRequired, 'task_snapshot')
    assert.deepEqual(result.warningRecipients, ['reviewee', 'counterparty', 'admin'])
  })

  test('missing assignment submission review and skill reviews are required gaps', ({ assert }) => {
    const result = evaluateReviewDisputeReadiness({
      ...completeInput,
      assignmentSnapshot: null,
      submissionSnapshot: null,
      reviewSnapshot: null,
      skillReviewsSnapshot: [],
    })

    assert.isFalse(result.readyForNormalResolution)
    assert.includeMembers(result.missingRequired, [
      'assignment_snapshot',
      'submission_snapshot',
      'review_snapshot',
      'skill_reviews_snapshot',
    ])
  })

  test('missing two-sided dispute exchange blocks normal resolution', ({ assert }) => {
    const result = evaluateReviewDisputeReadiness({
      ...completeInput,
      disputeClaimSnapshot: {
        dispute_reason: 'Review does not reflect evidence',
        requested_outcome: 'adjust_score',
        dispute_comments: [
          {
            author_context: 'reviewee',
            body: 'Please review the pull request again.',
          },
        ],
      },
    })

    assert.isFalse(result.readyForNormalResolution)
    assert.include(result.missingRequired, 'counterparty_dispute_message')
  })

  test('missing recommended data is reported without blocking normal resolution', ({ assert }) => {
    const result = evaluateReviewDisputeReadiness({
      ...completeInput,
      taskCommentsSnapshot: [],
      evidencesSnapshot: [],
      selfAssessmentSnapshot: null,
      taskHistorySnapshot: [],
      reviewerContextSnapshot: null,
      revieweeProfileContextSnapshot: null,
    })

    assert.isTrue(result.readyForNormalResolution)
    assert.includeMembers(result.missingRecommended, [
      'task_comments_snapshot',
      'evidences_snapshot',
      'self_assessment_snapshot',
      'task_history_snapshot',
      'reviewer_context_snapshot',
      'reviewee_profile_context_snapshot',
    ])
  })

  test('override requires explicit reason when required data is missing', ({ assert }) => {
    const withoutReason = evaluateReviewDisputeReadiness({
      ...completeInput,
      taskSnapshot: null,
      overrideReadiness: true,
      overrideReason: ' ',
    })

    assert.isFalse(withoutReason.readyForNormalResolution)
    assert.include(withoutReason.missingRequired, 'override_reason')

    const withReason = evaluateReviewDisputeReadiness({
      ...completeInput,
      taskSnapshot: null,
      overrideReadiness: true,
      overrideReason: 'Legacy case file lacks task snapshot but admin verified source records.',
    })

    assert.isTrue(withReason.readyForNormalResolution)
    assert.include(withReason.missingRequired, 'task_snapshot')
  })
})
