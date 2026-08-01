import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  CacheInvalidationOutboxReplayRepository,
  CacheInvalidationOutboxReplayTransactionRunner,
} from '#modules/cache/actions/ports/outbound/cache_invalidation_outbox_replay_ports'
import { normalizeCacheInvalidationReplayRequest } from '#modules/cache/domain/cache_invalidation_outbox'
import type { CacheInvalidationOutboxReplaySelector } from '#modules/cache/public_contracts/cache_invalidation_outbox_types'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export interface ReplayCacheInvalidationOutboxInput {
  selector: CacheInvalidationOutboxReplaySelector
  reason: string
  now?: Date
}

export interface ReplayCacheInvalidationOutboxResult {
  affectedCount: number
  outboxIds: string[]
}

interface CacheInvalidationReplayAuditWriter {
  write: typeof auditPublicApi.write
}

export class ReplayCacheInvalidationOutboxCommand {
  constructor(
    private readonly repository: CacheInvalidationOutboxReplayRepository,
    private readonly transactionRunner: CacheInvalidationOutboxReplayTransactionRunner,
    private readonly auditWriter: CacheInvalidationReplayAuditWriter = auditPublicApi
  ) {}

  async execute(
    input: ReplayCacheInvalidationOutboxInput,
    execCtx: AuditActionContext
  ): Promise<ReplayCacheInvalidationOutboxResult> {
    if (!execCtx.userId) {
      throw new UnauthorizedException()
    }
    const normalized = normalizeCacheInvalidationReplayRequest(input.selector, input.reason)
    const now = input.now ?? new Date()

    return this.transactionRunner.run(async (trx) => {
      const replayed = await this.repository.replayDeadLetters(normalized.selector, now, trx)
      const outboxIds = replayed.map((row) => row.id)

      for (const row of replayed) {
        await this.auditWriter.write(
          execCtx,
          {
            action: 'cache_invalidation_outbox.replayed',
            event_name: 'cache.invalidation_outbox.replayed',
            event_family: 'cache_operations',
            module: 'cache',
            subsystem: 'invalidation_outbox',
            workflow: 'cache_invalidation_outbox_replay',
            stage: 'completed',
            severity: 'warning',
            outcome: 'success',
            actor_type: 'operator',
            entity_type: 'cache_invalidation_outbox',
            entity_id: row.id,
            target_type: 'cache_invalidation_outbox',
            target_id: row.id,
            retention_class: 'security',
            critical: true,
            new_values: {
              actorId: execCtx.userId,
              reason: normalized.reason,
              selector: normalized.selector,
              affectedCount: replayed.length,
              outboxIds,
              previousStatus: row.previousStatus,
              resultingStatus: 'pending',
              replayedAt: now.toISOString(),
            },
          },
          trx
        )
      }

      return {
        affectedCount: replayed.length,
        outboxIds,
      }
    })
  }
}
