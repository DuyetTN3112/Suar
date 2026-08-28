import { test } from '@japa/runner'

import ConfirmReviewCommand from '#modules/reviews/actions/commands/review-submission/confirm_review_command'
import { ConfirmReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'

test('confirm review exposes expected application failures through the canonical Result', async ({
  assert,
}) => {
  const unitOfWork: ReviewConfirmationDisputeUnitOfWork = {
    run: () => Promise.reject(new Error('unit-of-work should not run')),
  }
  const command = new ConfirmReviewCommand(
    {
      userId: null,
      ip: '127.0.0.1',
      userAgent: 'unit-test',
      organizationId: null,
    },
    unitOfWork
  )

  const result = await command.executeAndWrap(
    new ConfirmReviewDTO({ review_session_id: 'review-1', action: 'confirmed' })
  )

  assert.isTrue(result.isFailure())
  assert.equal(result.getError().code, 'E_UNAUTHORIZED')
})
