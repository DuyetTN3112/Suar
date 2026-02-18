import { test } from '@japa/runner'

import { makeDetectAnomalyCommand } from '#composition/review_action_factory'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'

test.group('DetectAnomalyCommand failure semantics', () => {
  test('propagates repository failures instead of reporting a clean review', async ({
    assert,
    cleanup,
  }) => {
    const originalList =
      SkillReviewRepository.listSubmittedBySessionAndReviewer.bind(SkillReviewRepository)
    const dependencyFailure = new Error('skill review repository unavailable')

    SkillReviewRepository.listSubmittedBySessionAndReviewer = () =>
      Promise.reject(dependencyFailure)
    cleanup(() => {
      SkillReviewRepository.listSubmittedBySessionAndReviewer = originalList
    })

    await assert.rejects(
      () =>
        makeDetectAnomalyCommand(makeSystemReviewActionContext('reviewer-1')).handle({
          reviewSessionId: 'review-session-1',
          reviewerId: 'reviewer-1',
        }),
      /skill review repository unavailable/
    )
  })

  test('fails closed when the authoritative submission has no skill reviews', async ({
    assert,
    cleanup,
  }) => {
    const originalList =
      SkillReviewRepository.listSubmittedBySessionAndReviewer.bind(SkillReviewRepository)
    SkillReviewRepository.listSubmittedBySessionAndReviewer = () => Promise.resolve([])
    cleanup(() => {
      SkillReviewRepository.listSubmittedBySessionAndReviewer = originalList
    })

    await assert.rejects(
      () =>
        makeDetectAnomalyCommand(makeSystemReviewActionContext('reviewer-1')).handle({
          reviewSessionId: 'review-session-1',
          reviewerId: 'reviewer-1',
        }),
      InvariantViolationException
    )
  })
})
