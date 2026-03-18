import { createForCompletedAssignmentIfMissing } from './review_session_mutations.js'

import type { ReviewSessionCommandRepositoryPort } from '#modules/reviews/actions/ports/outbound/review_session_command_repository_port'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'

export const reviewSessionCommandRepository: ReviewSessionCommandRepositoryPort = {
  createForCompletedAssignmentIfMissing(input, trx) {
    return createForCompletedAssignmentIfMissing(input, toLucidReviewTransaction(trx))
  },
}
