import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  AiDisputeAutoQueueIntentJob,
  AiDisputeAutoQueueIntentRepository,
  ClaimAiDisputeAutoQueueIntentInput,
  ClaimAiDisputeAutoQueueIntentsInput,
  CompleteAiDisputeAutoQueueIntentInput,
  FailAiDisputeAutoQueueIntentInput,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_auto_queue_intent_repository'
import type {
  AiDisputeSourceType,
  StageAiDisputeAutoQueueIntentInput,
} from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

interface AiDisputeAutoQueueIntentRow {
  id: string
  source_type: AiDisputeSourceType
  source_id: string
  organization_id: string | null
  request_id: string | null
  trace_id: string | null
  workflow_id: string | null
  attempt_count: number
  lease_token: string
}

function toJob(row: AiDisputeAutoQueueIntentRow): AiDisputeAutoQueueIntentJob {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    organizationId: row.organization_id,
    requestId: row.request_id,
    traceId: row.trace_id,
    workflowId: row.workflow_id,
    attemptCount: row.attempt_count,
    leaseToken: row.lease_token,
  }
}

function affectedRows(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (Array.isArray(value)) return value.length
  return 0
}

export async function stageAiDisputeAutoQueueIntent(
  trx: TransactionClientContract,
  input: StageAiDisputeAutoQueueIntentInput
): Promise<void> {
  await trx
    .table('ai_dispute_auto_queue_intents')
    .insert({
      source_type: input.sourceType,
      source_id: input.sourceId,
      organization_id: input.requestContext.organizationId,
      request_id: input.requestContext.requestId ?? null,
      trace_id: input.requestContext.traceId ?? null,
      workflow_id: input.requestContext.workflowId ?? null,
    })
    .onConflict(['source_type', 'source_id'])
    .ignore()
}

export class PostgresAiDisputeAutoQueueIntentRepository implements AiDisputeAutoQueueIntentRepository {
  async claimBatch(
    input: ClaimAiDisputeAutoQueueIntentsInput
  ): Promise<AiDisputeAutoQueueIntentJob[]> {
    const lockedUntil = new Date(input.now.getTime() + input.leaseMs)
    return db.transaction(async (trx) => {
      const rawResult: unknown = await trx.rawQuery(
        `
          WITH candidates AS (
            SELECT id
            FROM ai_dispute_auto_queue_intents
            WHERE (
              (status = 'pending' AND available_at <= ?)
              OR (status = 'leased' AND locked_until <= ?)
            )
            ORDER BY available_at ASC, created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ?
          )
          UPDATE ai_dispute_auto_queue_intents AS intent
          SET
            status = 'leased',
            attempt_count = intent.attempt_count + 1,
            locked_by = ?,
            locked_until = ?,
            lease_token = gen_random_uuid(),
            updated_at = ?
          FROM candidates
          WHERE intent.id = candidates.id
          RETURNING intent.*
        `,
        [input.now, input.now, input.batchSize, input.workerId, lockedUntil, input.now]
      )
      const rows = (rawResult as { rows?: AiDisputeAutoQueueIntentRow[] }).rows ?? []
      return rows.map(toJob)
    })
  }

  async claimSource(
    input: ClaimAiDisputeAutoQueueIntentInput
  ): Promise<AiDisputeAutoQueueIntentJob | null> {
    const lockedUntil = new Date(input.now.getTime() + input.leaseMs)
    const rows = (await db
      .from('ai_dispute_auto_queue_intents')
      .where('source_type', input.sourceType)
      .where('source_id', input.sourceId)
      .where((query) => {
        void query
          .where((pending) => {
            void pending.where('status', 'pending').where('available_at', '<=', input.now)
          })
          .orWhere((expiredLease) => {
            void expiredLease.where('status', 'leased').where('locked_until', '<=', input.now)
          })
      })
      .update({
        status: 'leased',
        attempt_count: db.raw('attempt_count + 1'),
        locked_by: input.workerId,
        locked_until: lockedUntil,
        lease_token: db.raw('gen_random_uuid()'),
        updated_at: input.now,
      })
      .returning('*')) as AiDisputeAutoQueueIntentRow[]
    return rows[0] ? toJob(rows[0]) : null
  }

  async hasEvaluation(sourceType: AiDisputeSourceType, sourceId: string): Promise<boolean> {
    const row = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', sourceType)
      .where('source_id', sourceId)
      .select('id')
      .first()) as { id: string } | undefined
    return Boolean(row)
  }

  async acknowledge(input: CompleteAiDisputeAutoQueueIntentInput): Promise<boolean> {
    const affected = await db
      .from('ai_dispute_auto_queue_intents')
      .where('id', input.job.id)
      .where('status', 'leased')
      .where('lease_token', input.job.leaseToken)
      .where('locked_until', '>', input.now)
      .update({
        status: 'processed',
        processed_at: input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        last_error_code: null,
        updated_at: input.now,
      })
    return affectedRows(affected) === 1
  }

  async fail(input: FailAiDisputeAutoQueueIntentInput): Promise<boolean> {
    const deadLettered = input.availableAt === null
    const affected = await db
      .from('ai_dispute_auto_queue_intents')
      .where('id', input.job.id)
      .where('status', 'leased')
      .where('lease_token', input.job.leaseToken)
      .where('locked_until', '>', input.now)
      .update({
        status: deadLettered ? 'dead_letter' : 'pending',
        available_at: input.availableAt ?? input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        last_error_code: input.errorCode.slice(0, 128),
        updated_at: input.now,
      })
    return affectedRows(affected) === 1
  }
}
