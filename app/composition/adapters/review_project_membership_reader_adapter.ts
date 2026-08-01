import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import type { ReviewProjectMembershipReader } from '#modules/reviews/actions/ports/outbound/review_project_membership_reader'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'

export class ReviewProjectMembershipReaderAdapter
  implements ReviewProjectMembershipReader
{
  listProjectIdsForMember(
    userId: string,
    trx?: Parameters<ReviewProjectMembershipReader['listProjectIdsForMember']>[1]
  ): Promise<string[]> {
    return projectMemberQueries.listProjectIdsForMember(userId, toLucidReviewTransaction(trx))
  }
}
