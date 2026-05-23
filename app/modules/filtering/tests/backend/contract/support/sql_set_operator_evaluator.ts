import db from '@adonisjs/lucid/services/db'

import type { FilterScalar } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  canonicalizeFilterScalarSet,
  type FilterSetOperator,
} from '#modules/filtering/domain/filtering-core/filter_operators'

export interface SqlSetOperatorRecord {
  readonly id: string
  readonly labels: readonly string[]
}

export async function executeSqlSetOperator(
  records: readonly SqlSetOperatorRecord[],
  operator: FilterSetOperator,
  selectedValues: readonly FilterScalar[],
  minimumMatch?: number
): Promise<string[]> {
  const selected = canonicalizeFilterScalarSet(selectedValues).map(String)
  const canonicalRecords = records.map((record) => ({
    id: record.id,
    labels: canonicalizeFilterScalarSet(record.labels).map(String),
  }))

  return db.transaction(async (trx) => {
    await trx.rawQuery(
      'CREATE TEMPORARY TABLE filter_tc_fst_006_labels (id text PRIMARY KEY, labels text[] NOT NULL) ON COMMIT DROP'
    )

    for (const record of canonicalRecords) {
      await trx.rawQuery(
        'INSERT INTO filter_tc_fst_006_labels (id, labels) VALUES (?, ARRAY(SELECT jsonb_array_elements_text(?::jsonb)))',
        [record.id, JSON.stringify(record.labels)]
      )
    }

    const predicate = sqlPredicate(operator, minimumMatch)
    const bindings = [JSON.stringify(selected), ...(minimumMatch === undefined ? [] : [minimumMatch])]
    const result: unknown = await trx.rawQuery(
      `WITH selected AS (
         SELECT value
         FROM jsonb_array_elements_text(?::jsonb) AS selected(value)
       )
       SELECT id
       FROM filter_tc_fst_006_labels
       WHERE ${predicate}
       ORDER BY id`,
      bindings
    )

    return readRows(result).map(({ id }) => id)
  })
}

function sqlPredicate(operator: FilterSetOperator, minimumMatch?: number): string {
  switch (operator) {
    case 'contains_any':
      return 'EXISTS (SELECT 1 FROM selected WHERE value = ANY (labels))'
    case 'contains_all':
      return 'NOT EXISTS (SELECT 1 FROM selected WHERE NOT (value = ANY (labels)))'
    case 'contains_none':
      return 'NOT EXISTS (SELECT 1 FROM selected WHERE value = ANY (labels))'
    case 'contains_exactly':
      return [
        'NOT EXISTS (SELECT 1 FROM selected WHERE NOT (value = ANY (labels)))',
        'cardinality(labels) = (SELECT count(*) FROM selected)',
      ].join(' AND ')
    case 'contains_at_least':
      if (minimumMatch === undefined) throw new TypeError('At-least-N requires minimumMatch')
      return '(SELECT count(*) FROM selected WHERE value = ANY (labels)) >= ?'
    case 'is_empty':
      return 'cardinality(labels) = 0'
  }
}

function readRows(value: unknown): Array<{ id: string }> {
  if (value === null || typeof value !== 'object' || !('rows' in value)) return []
  const rows = (value as { rows?: unknown }).rows
  if (!Array.isArray(rows)) return []
  return rows.filter(
    (row: unknown): row is { id: string } =>
      row !== null && typeof row === 'object' && 'id' in row && typeof row.id === 'string'
  )
}
