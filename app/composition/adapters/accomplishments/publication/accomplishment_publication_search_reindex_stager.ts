import { createHash } from 'node:crypto'

import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  AccomplishmentPublicationSearchReindexStager,
  StageAccomplishmentPublicationSearchReindexInput,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_search_reindex_stager'
import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import type { SearchProjectionInvalidationStager } from '#modules/search/actions/ports/outbound/search_projection_invalidation_stager'
import { PostgresSearchProjectionInvalidationStager } from '#modules/search/infra/adapters/projection-generation/postgres_search_projection_invalidation_stager'

export default class AccomplishmentPublicationSearchReindexStagerAdapter
  implements AccomplishmentPublicationSearchReindexStager
{
  constructor(
    private readonly invalidationStager: SearchProjectionInvalidationStager =
      new PostgresSearchProjectionInvalidationStager()
  ) {}

  async stage(
    transaction: AccomplishmentTransaction,
    input: StageAccomplishmentPublicationSearchReindexInput
  ): Promise<void> {
    const sourceEventId = createHash('sha256')
      .update(
        `accomplishment-publication:${input.operation}:${input.projectionId}:${input.publicationVersion}:${input.sourceEventId}`
      )
      .digest('hex')
    await stageDomainEvent(transaction, {
      eventName: 'search:talent-reindex-requested',
      dedupeKey: sourceEventId,
      aggregateType: 'user_talent',
      aggregateId: input.userId,
      payload: {
        userId: input.userId,
        sourceEventName: 'accomplishment:publication:changed:v1',
        sourceEventId,
      },
    })
    await this.invalidationStager.stage(transaction, {
      entityType: 'accomplishment_publication',
      entityId: input.userId,
      operation: input.operation === 'published' ? 'upsert' : 'delete',
      sourceRevision: sourceEventId,
      changedFields: ['public_accomplishments'],
      transactionKey: sourceEventId,
    })
  }
}
