import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'

export type AccomplishmentPublicationSearchReindexOperation = 'published' | 'unpublished'

export interface StageAccomplishmentPublicationSearchReindexInput {
  readonly userId: string
  readonly projectionId: string
  readonly publicationVersion: number
  readonly operation: AccomplishmentPublicationSearchReindexOperation
  readonly sourceEventId: string
}

/** Stages a durable Search invalidation in the same application transaction as publication. */
export interface AccomplishmentPublicationSearchReindexStager {
  stage(
    transaction: AccomplishmentTransaction,
    input: StageAccomplishmentPublicationSearchReindexInput
  ): Promise<void>
}
