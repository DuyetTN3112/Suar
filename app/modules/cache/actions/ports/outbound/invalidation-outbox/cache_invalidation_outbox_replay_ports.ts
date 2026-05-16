import type { CacheInvalidationOutboxReplayRow } from '#modules/cache/domain/invalidation-outbox/cache_invalidation_outbox'
import type { CacheInvalidationOutboxReplaySelector } from '#modules/cache/public_contracts/invalidation-outbox/cache_invalidation_outbox_types'

export type CacheInvalidationOutboxReplayTransaction = object

export abstract class CacheInvalidationOutboxReplayRepository {
  abstract replayDeadLetters(
    selector: CacheInvalidationOutboxReplaySelector,
    now: Date,
    trx: CacheInvalidationOutboxReplayTransaction
  ): Promise<CacheInvalidationOutboxReplayRow[]>
}

export abstract class CacheInvalidationOutboxReplayTransactionRunner {
  abstract run<T>(
    callback: (trx: CacheInvalidationOutboxReplayTransaction) => Promise<T>
  ): Promise<T>
}
