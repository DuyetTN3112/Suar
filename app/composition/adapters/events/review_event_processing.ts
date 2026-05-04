import { projectVerifiedAccomplishmentInTransaction } from '#composition/accomplishments/verified-work/accomplishment_projection_composition'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  LucidDisputeResolvedReceiptStore,
  LucidReviewConfirmedReceiptStore,
  LucidReviewEventSourceReader,
  LucidReviewProjectionLock,
  LucidReviewSubmittedReceiptStore,
} from '#modules/reviews/infra/adapters/review-core/lucid_review_event_processing'
import { LucidReviewTransactionRunner } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'

const reviewTransactions = new LucidReviewTransactionRunner()

export const reviewEventProcessing = {
  transactions: reviewTransactions,
  submittedReceipts: new LucidReviewSubmittedReceiptStore(),
  confirmedReceipts: new LucidReviewConfirmedReceiptStore(),
  disputeReceipts: new LucidDisputeResolvedReceiptStore(),
  sources: new LucidReviewEventSourceReader(),
  projectionLock: new LucidReviewProjectionLock(),
  accomplishmentProjector: {
    async project(
      identity: {
        reviewWorkflowId: string
        completionClaimId: string
        reviewFinalizedFactId: string
        reviewFinalizedFactHash: string
        projectionPolicyVersion: string
      },
      transaction: object
    ) {
      if (!/^sha256:[0-9a-f]{64}$/u.test(identity.reviewFinalizedFactHash)) {
        throw new InvariantViolationException('review_finalized_fact_hash_invalid')
      }
      await projectVerifiedAccomplishmentInTransaction(
        {
          ...identity,
          reviewFinalizedFactHash: identity.reviewFinalizedFactHash as `sha256:${string}`,
        },
        transaction
      )
    },
  },
}
