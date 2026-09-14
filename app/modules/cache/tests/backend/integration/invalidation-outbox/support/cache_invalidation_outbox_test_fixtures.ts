import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  CACHE_INVALIDATION_OUTBOX_DOWN_SQL,
  CACHE_INVALIDATION_OUTBOX_UP_SQL,
} from '#database/cache_invalidation_outbox_schema'

export const baseTime = new Date('2026-07-23T00:00:00.000Z')
let syntheticTransactionId = 9_000_000
let schemaWasPreexisting = false

export async function outboxTableExists(): Promise<boolean> {
  const row = (await db
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', 'cache_invalidation_outbox')
    .first()) as { table_name?: string } | undefined

  return Boolean(row)
}

export async function installSchema(): Promise<void> {
  schemaWasPreexisting = await outboxTableExists()
  for (const statement of CACHE_INVALIDATION_OUTBOX_DOWN_SQL) {
    if (!schemaWasPreexisting) {
      await db.rawQuery(statement)
    }
  }
  for (const statement of CACHE_INVALIDATION_OUTBOX_UP_SQL) {
    await db.rawQuery(statement)
  }
}

export async function uninstallSchema(): Promise<void> {
  if (schemaWasPreexisting) {
    return
  }

  for (const statement of CACHE_INVALIDATION_OUTBOX_DOWN_SQL) {
    await db.rawQuery(statement)
  }
}

export async function clearOutbox(): Promise<void> {
  await db.from('cache_invalidation_outbox').delete()
}

export async function seedOutbox(
  patterns: unknown,
  options: { attemptCount?: number; availableAt?: Date } = {}
): Promise<string> {
  syntheticTransactionId += 1
  const id = randomUUID()
  await db.table('cache_invalidation_outbox').insert({
    id,
    transaction_id: syntheticTransactionId,
    source_table: 'tasks',
    source_operation: 'UPDATE',
    source_primary_key: randomUUID(),
    patterns: JSON.stringify(patterns),
    attempt_count: options.attemptCount ?? 0,
    available_at: options.availableAt ?? baseTime,
  })
  return id
}

export async function outboxRow(id: string): Promise<Record<string, unknown>> {
  const row = (await db.from('cache_invalidation_outbox').where('id', id).first()) as
    | Record<string, unknown>
    | undefined
  if (!row) {
    throw new Error(`Missing cache invalidation outbox row ${id}`)
  }
  return row
}
