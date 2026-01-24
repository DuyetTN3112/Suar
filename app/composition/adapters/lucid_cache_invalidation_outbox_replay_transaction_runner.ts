import db from '@adonisjs/lucid/services/db'

import {
  CacheInvalidationOutboxReplayTransactionRunner,
  type CacheInvalidationOutboxReplayTransaction,
} from '#modules/cache/actions/ports/outbound/cache_invalidation_outbox_replay_ports'

export class LucidCacheInvalidationOutboxReplayTransactionRunner
  extends CacheInvalidationOutboxReplayTransactionRunner
{
  run<T>(
    callback: (trx: CacheInvalidationOutboxReplayTransaction) => Promise<T>
  ): Promise<T> {
    return db.transaction((trx) => callback(trx))
  }
}
