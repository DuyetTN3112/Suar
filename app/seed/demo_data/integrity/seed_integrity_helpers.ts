import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export function fail(message: string): never {
  throw new Error(`Seed integrity failed: ${message}`)
}

export async function tableExists(
  trx: TransactionClientContract,
  table: string
): Promise<boolean> {
  const row = (await trx
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', table)
    .first()) as unknown

  return Boolean(row)
}

export async function countRowsIfTableExists(
  trx: TransactionClientContract,
  table: string
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  const row = (await trx.from(table).count('* as total').first()) as {
    total: string | number
  } | null

  return Number(row?.total ?? 0)
}

export async function countRowsWhere(
  trx: TransactionClientContract,
  table: string,
  where: Record<string, string>
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  let query = trx.from(table)
  for (const [key, value] of Object.entries(where)) {
    query = query.where(key, value)
  }

  const row = (await query.count('* as total').first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

export async function countReverseReviewReportRuntimeContexts(
  trx: TransactionClientContract
): Promise<number> {
  if (!(await tableExists(trx, 'sprint_reverse_review_messages'))) {
    return 0
  }

  const row = (await trx
    .from('sprint_reverse_review_messages')
    .where('message_type', 'report')
    .whereRaw("metadata->'runtime_context' IS NOT NULL")
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

export async function countTaskReviewRuntimeContextsWithSprintPeerTasks(
  trx: TransactionClientContract
): Promise<number> {
  if (!(await tableExists(trx, 'task_review_workflows'))) {
    return 0
  }

  const row = (await trx
    .from('task_review_workflows')
    .whereRaw("runtime_context->>'schema_version' = 'suar_task_review_workflow_runtime_context_v1'")
    .whereRaw("jsonb_array_length(COALESCE(runtime_context->'sprint_peer_tasks', '[]'::jsonb)) > 0")
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}

export async function countResolvedDisputeRows(
  trx: TransactionClientContract,
  table: string
): Promise<number> {
  if (!(await tableExists(trx, table))) {
    return 0
  }

  const row = (await trx
    .from(table)
    .where('status', 'resolved')
    .whereNotNull('final_decision')
    .whereNotNull('final_rationale')
    .whereNotNull('resolved_at')
    .whereNotNull('resolved_by')
    .count('* as total')
    .first()) as { total: string | number } | null

  return Number(row?.total ?? 0)
}
