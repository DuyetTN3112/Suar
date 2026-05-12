import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseQueryBuilderContract } from '@adonisjs/lucid/types/querybuilder'

import {
  AUDIT_LOG_FILTER_BINDINGS,
  compileAuditLogFilterExpression,
  compileAuditLogTextSearch,
  reduceAuditLogFilterForSelfExcludingFacet,
} from '#modules/audit/infra/adapters/filtering/audit_log_filter_semantic_bindings'
import type { AdminAuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type AuditQuery = DatabaseQueryBuilderContract<Record<string, unknown>>
type FilterContextDefinition = Awaited<ReturnType<FilterContextProvider['getEffectiveDefinition']>>
type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>

export interface AuditLogFilterExecutorInput<TAuthorization extends object = object> {
  readonly definition: FilterContextDefinition
  readonly criteria: QueryCriteriaRequest
  readonly mandatoryFilter?: FilterExpression
  readonly eligibilityFilter?: FilterExpression
  readonly authorizationBinding: TAuthorization
  readonly requestId: string
  readonly signal?: AbortSignal
}

interface AuditHitRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  event_name: string | null
  event_family: string | null
  module: string | null
  subsystem: string | null
  workflow: string | null
  stage: string | null
  severity: string | null
  outcome: string | null
  actor_type: string | null
  actor_user_id: string | null
  actor_org_id: string | null
  actor_role_surface: string | null
  target_type: string | null
  target_id: string | null
  target_org_id: string | null
  request_id: string | null
  trace_id: string | null
  correlation_key: string | null
  retention_class: string | null
  source_occurred_at: Date | string | null
  redaction_applied: boolean
  schema_version: number
  event_hash: string | null
  prev_hash: string | null
  occurred_at: Date | string
}

export interface FilterAuditLogsQueryResult {
  readonly hits: readonly AdminAuditLogRecord[]
  readonly total: number
  readonly facets: readonly FilterFacetGroup[]
}

const SAFE_HIT_COLUMNS = [
  'id',
  'user_id',
  'action',
  'entity_type',
  'entity_id',
  'event_name',
  'event_family',
  'module',
  'subsystem',
  'workflow',
  'stage',
  'severity',
  'outcome',
  'actor_type',
  'actor_user_id',
  'actor_org_id',
  'actor_role_surface',
  'target_type',
  'target_id',
  'target_org_id',
  'request_id',
  'trace_id',
  'correlation_key',
  'retention_class',
  'source_occurred_at',
  'redaction_applied',
  'schema_version',
  'event_hash',
  'prev_hash',
  'occurred_at',
] as const

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
}

function auditEventsQuery(trx: TransactionClientContract): AuditQuery {
  return trx.query<Record<string, unknown>>().from('audit_events')
}

function applyCriteria(
  query: AuditQuery,
  text: string | undefined,
  expression: FilterExpression | undefined,
  now: Date
): AuditQuery {
  let scoped = query
  if (text !== undefined && text.trim().length > 0) {
    const compiledText = compileAuditLogTextSearch(text)
    scoped = scoped.whereRaw(compiledText.sql, [...compiledText.bindings])
  }
  if (expression !== undefined) {
    const compiled = compileAuditLogFilterExpression(expression, now)
    scoped = scoped.whereRaw(compiled.sql, [...compiled.bindings])
  }
  return scoped
}

function compose(
  mandatory: FilterExpression | undefined,
  user: FilterExpression | undefined
): FilterExpression | undefined {
  if (mandatory === undefined) return user
  if (user === undefined) return mandatory
  return { kind: 'group', combinator: 'and', children: [mandatory, user] }
}

function selectedFacetValues(expression: FilterExpression | undefined, field: string): Set<string> {
  const selected = new Set<string>()
  if (expression === undefined) return selected
  if (expression.kind === 'group') {
    for (const child of expression.children) {
      for (const value of selectedFacetValues(child, field)) selected.add(value)
    }
    return selected
  }
  if (expression.field !== field) return selected
  const values =
    expression.value?.kind === 'scalar'
      ? [expression.value.value]
      : expression.value?.kind === 'set'
        ? expression.value.values
        : []
  for (const value of values) {
    selected.add(String(value).trim().normalize('NFKC').toLocaleLowerCase('en-US'))
  }
  return selected
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replace(/[%_]/gu, '\\$&')
}

async function buildFacet(
  trx: TransactionClientContract,
  input: AuditLogFilterExecutorInput,
  now: Date,
  request: NonNullable<QueryCriteriaRequest['requestedFacets']>[number]
): Promise<FilterFacetGroup> {
  if (request.cursor !== undefined) throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  const binding = AUDIT_LOG_FILTER_BINDINGS[request.field]
  if (!binding?.facetable) {
    throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
  }

  let expression = input.eligibilityFilter ?? input.criteria.filter
  if (request.countMode === 'self_excluding') {
    const reduction = reduceAuditLogFilterForSelfExcludingFacet(
      input.criteria.filter,
      request.field
    )
    if (!reduction.supported) {
      throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }
    expression = compose(input.mandatoryFilter, reduction.expression)
  }

  const facetExpression = `lower((${binding.sqlExpression})::text)`
  let query = applyCriteria(auditEventsQuery(trx), input.criteria.text?.value, expression, now)
    .whereRaw(`${binding.sqlExpression} is not null`)
    .select(db.raw(`${facetExpression} as value`))
    .count('* as count')
    .groupByRaw(facetExpression)

  if (request.valueSearch?.trim()) {
    query = query.whereRaw(`${facetExpression} like ? escape '\\'`, [
      `%${escapeLike(request.valueSearch.trim().normalize('NFKC').toLocaleLowerCase('en-US'))}%`,
    ])
  }

  const rows = (await query
    .orderByRaw('count(*) desc')
    .orderBy('value', 'asc')
    .limit(100)) as Array<{
    value: string
    count: string | number
  }>
  const selected = selectedFacetValues(input.criteria.filter, request.field)
  const counts = new Map(rows.map(({ value, count }) => [value, Number(count)]))
  for (const value of selected) if (!counts.has(value)) counts.set(value, 0)
  const values = [...counts]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => {
      const byCount = rightCount - leftCount
      return byCount === 0 ? leftValue.localeCompare(rightValue) : byCount
    })
    .map(([value, count]) => ({
      value,
      count,
      countRelation: 'exact' as const,
      selected: selected.has(value),
    }))

  return {
    field: request.field,
    countMode: request.countMode ?? 'constrained',
    values,
  }
}

function applyStableSort(query: AuditQuery, input: AuditLogFilterExecutorInput): AuditQuery {
  const sorts =
    input.criteria.sort.length === 0
      ? [{ field: 'audit.createdAt', direction: 'desc' as const }]
      : input.criteria.sort
  let sorted = query
  for (const sort of sorts) {
    const binding = AUDIT_LOG_FILTER_BINDINGS[sort.field]
    if (!binding?.sortable || sort.field !== 'audit.createdAt') {
      throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
    }
    sorted = sorted.orderBy('occurred_at', sort.direction)
  }
  return sorted.orderBy('id', sorts.at(-1)?.direction ?? 'desc')
}

function mapHit(row: AuditHitRow): AdminAuditLogRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    old_values: null,
    new_values: null,
    ip_address: null,
    user_agent: null,
    event_name: row.event_name,
    event_family: row.event_family,
    module: row.module,
    subsystem: row.subsystem,
    workflow: row.workflow,
    stage: row.stage,
    severity: row.severity,
    outcome: row.outcome,
    actor_type: row.actor_type,
    actor_user_id: row.actor_user_id,
    actor_org_id: row.actor_org_id,
    actor_role_surface: row.actor_role_surface,
    target_type: row.target_type,
    target_id: row.target_id,
    target_org_id: row.target_org_id,
    request_id: row.request_id,
    trace_id: row.trace_id,
    correlation_key: row.correlation_key,
    retention_class: row.retention_class,
    source_occurred_at: row.source_occurred_at === null ? null : new Date(row.source_occurred_at),
    redaction_applied: row.redaction_applied,
    schema_version: row.schema_version,
    event_hash: row.event_hash,
    prev_hash: row.prev_hash,
    created_at: new Date(row.occurred_at),
  }
}

export class FilterAuditLogsQuery {
  async execute<TAuthorization extends object>(
    input: AuditLogFilterExecutorInput<TAuthorization>,
    now: Date
  ): Promise<FilterAuditLogsQueryResult> {
    throwIfAborted(input.signal)
    return db.transaction(async (trx) => {
      await trx.rawQuery('set transaction isolation level repeatable read read only')
      throwIfAborted(input.signal)

      const expression = input.eligibilityFilter ?? input.criteria.filter
      const baseQuery = applyCriteria(
        auditEventsQuery(trx),
        input.criteria.text?.value,
        expression,
        now
      )
      const countRow = (await baseQuery.clone().count('* as count').first()) as
        | { count?: string | number }
        | undefined
      throwIfAborted(input.signal)

      const offset = input.criteria.page.offset ?? 0
      const pageQuery = applyStableSort(baseQuery.clone(), input)
        .select([...SAFE_HIT_COLUMNS])
        .offset(offset)
        .limit(input.criteria.page.size)
      const rows = (await pageQuery) as unknown as AuditHitRow[]
      throwIfAborted(input.signal)

      const facets: FilterFacetGroup[] = []
      for (const request of input.criteria.requestedFacets ?? []) {
        facets.push(await buildFacet(trx, input, now, request))
        throwIfAborted(input.signal)
      }

      return {
        hits: rows.map(mapHit),
        total: Number(countRow?.count ?? 0),
        facets,
      }
    })
  }
}
