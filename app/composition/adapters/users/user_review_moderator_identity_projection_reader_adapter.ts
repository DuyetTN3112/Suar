import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import { ReviewModeratorIdentityProjectionReader } from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'

export class UserReviewModeratorIdentityProjectionReaderAdapter extends ReviewModeratorIdentityProjectionReader {
  async findByIds(
    userIds: string[],
    trx?: Parameters<ReviewModeratorIdentityProjectionReader['findByIds']>[1]
  ) {
    const facts = await userPublicApi.findModerationIdentityFactsV1(
      userIds,
      toLucidReviewTransaction(trx)
    )
    return facts.map((fact) => ({
      id: fact.id,
      username: fact.username,
      email: fact.email,
    }))
  }

  async findIdsByUsername(username: string): Promise<string[]> {
    return userPublicApi.findModerationIdentityIdsByUsername(username)
  }
}
