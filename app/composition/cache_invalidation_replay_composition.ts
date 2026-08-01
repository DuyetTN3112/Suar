import { LucidCacheInvalidationOutboxReplayTransactionRunner } from './adapters/lucid_cache_invalidation_outbox_replay_transaction_runner.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { ReplayCacheInvalidationOutboxCommand } from '#modules/cache/actions/commands/replay_cache_invalidation_outbox_command'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/postgres_cache_invalidation_outbox_repository'

export const replayCacheInvalidationOutboxCommand = new ReplayCacheInvalidationOutboxCommand(
  new PostgresCacheInvalidationOutboxRepository(),
  new LucidCacheInvalidationOutboxReplayTransactionRunner(),
  auditPublicApi
)
