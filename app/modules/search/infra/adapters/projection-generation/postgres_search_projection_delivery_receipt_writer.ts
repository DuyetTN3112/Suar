import db from '@adonisjs/lucid/services/db'

import type { SearchProjectionDeliveryReceiptWriter } from '#modules/search/actions/ports/outbound/search_projection_delivery_receipt_writer'

interface ReceiptRow {
  processed_at?: Date | string | null
}

function affectedRowCount(result: unknown): number {
  if (typeof result === 'number') return result
  if (Array.isArray(result)) return result.length
  return 0
}

export class PostgresSearchProjectionDeliveryReceiptWriter
  implements SearchProjectionDeliveryReceiptWriter
{
  async acknowledge(sourceEventId: string): Promise<boolean> {
    const row = (await db
      .from('search_projection_entity_revisions')
      .select('processed_at')
      .where('entity_type', 'accomplishment_publication')
      .where('source_revision', sourceEventId)
      .first()) as ReceiptRow | undefined

    if (!row) return false
    if (row.processed_at !== null && row.processed_at !== undefined) return true

    const updated = await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'accomplishment_publication')
      .where('source_revision', sourceEventId)
      .whereNull('processed_at')
      .update({ processed_at: new Date() })

    return affectedRowCount(updated) === 1
  }
}
