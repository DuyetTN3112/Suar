import { randomUUID } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { SearchProjectionInvalidationStager } from '#modules/search/actions/ports/outbound/search_projection_invalidation_stager'
import type { SearchProjectionInvalidation } from '#modules/search/public_contracts/search_projection_invalidation'

export class PostgresSearchProjectionInvalidationStager implements SearchProjectionInvalidationStager {
  async stage(transaction: object, input: SearchProjectionInvalidation): Promise<{ readonly id: string; readonly staged: boolean }> {
    const trx = transaction as TransactionClientContract
    const sourceRevision = input.sourceRevision ?? `${await this.readTaskRevision(trx, input.entityType, input.entityId)}:${randomUUID()}`
    const rows = (await trx.table('search_projection_entity_revisions').insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      operation: input.operation,
      source_revision: sourceRevision,
      changed_fields: JSON.stringify([...input.changedFields].sort()),
      transaction_key: input.transactionKey,
    }).onConflict(['entity_type', 'entity_id', 'source_revision']).ignore().returning(['id'])) as Array<{ id: string }>
    const inserted = rows[0]
    if (inserted) return { id: inserted.id, staged: true }
    const existing = (await trx.from('search_projection_entity_revisions').select('id').where('entity_type', input.entityType).where('entity_id', input.entityId).where('source_revision', sourceRevision).first()) as { id: string } | undefined
    if (!existing) throw new PersistedDataIntegrityException('search_projection_invalidation_dedupe_conflict')
    return { id: existing.id, staged: false }
  }

  private async readTaskRevision(transaction: TransactionClientContract, entityType: string, entityId: string): Promise<string> {
    if (entityType !== 'task') throw new InvariantViolationException('search_projection_invalidation_source_revision_required')
    const row = (await transaction.from('tasks').select('updated_at', 'created_at').where('id', entityId).first()) as { updated_at?: Date | string | null; created_at?: Date | string | null } | undefined
    const value = row?.updated_at ?? row?.created_at
    if (value === undefined || value === null) throw new PersistedDataIntegrityException('search_projection_task_revision_missing')
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
  }
}
