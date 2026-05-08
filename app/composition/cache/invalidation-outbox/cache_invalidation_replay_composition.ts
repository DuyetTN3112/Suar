import { LucidCacheInvalidationOutboxReplayTransactionRunner } from '#composition/adapters/cache/invalidation-outbox/lucid_cache_invalidation_outbox_replay_transaction_runner'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { ReplayCacheInvalidationOutboxCommand } from '#modules/cache/actions/commands/invalidation-outbox/replay_cache_invalidation_outbox_command'
import { PostgresCacheInvalidationOutboxRepository } from '#modules/cache/infra/repositories/invalidation-outbox/postgres_cache_invalidation_outbox_repository'

export const replayCacheInvalidationOutboxCommand = new ReplayCacheInvalidationOutboxCommand(
  new PostgresCacheInvalidationOutboxRepository(),
  new LucidCacheInvalidationOutboxReplayTransactionRunner(),
  auditPublicApi
)
