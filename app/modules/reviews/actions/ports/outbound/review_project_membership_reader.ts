import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface ReviewProjectMembershipReader {
  listProjectIdsForMember(
    userId: string,
    trx?: ReviewTransaction
  ): Promise<string[]>
}
