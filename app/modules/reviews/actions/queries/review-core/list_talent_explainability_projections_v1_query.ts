import { BaseQuery } from '#modules/reviews/actions/base_query'
import {
  buildTalentExplainabilityProjectionsV1,
  collectTalentExplainabilityProjectionUserIds,
} from '#modules/reviews/actions/mappers/talent_explainability_projection_mapper'
import type { TalentExplainabilityFactSourceReader } from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { TalentExplainabilityReviewProjectionV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

type ListTalentExplainabilityProjectionsV1Input = {
  revieweeUserIds: string[]
  trx?: ReviewTransaction
}

export default class ListTalentExplainabilityProjectionsV1Query extends BaseQuery<
  ListTalentExplainabilityProjectionsV1Input,
  TalentExplainabilityReviewProjectionV1[]
> {
  constructor(private readonly sources: TalentExplainabilityFactSourceReader) {
    super()
  }

  async execute(
    revieweeUserIds: string[],
    trx?: ReviewTransaction
  ): Promise<TalentExplainabilityReviewProjectionV1[]> {
    return this.handle({
      revieweeUserIds,
      ...(trx ? { trx } : {}),
    })
  }

  async handle({
    revieweeUserIds,
    trx,
  }: ListTalentExplainabilityProjectionsV1Input): Promise<
    TalentExplainabilityReviewProjectionV1[]
  > {
    const { uniqueUserIds, validUserIds } =
      collectTalentExplainabilityProjectionUserIds(revieweeUserIds)
    if (uniqueUserIds.length === 0) return []

    const source = await this.sources.load(validUserIds, trx)
    return buildTalentExplainabilityProjectionsV1(uniqueUserIds, source)
  }
}
