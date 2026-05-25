import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
type FilterCondition = Extract<FilterExpression, { kind: 'condition' }>

export interface AuditLogSqlFragment {
  readonly sql: string
  readonly bindings: readonly (string | number | boolean)[]
}

export interface AuditLogFilterBinding {
  readonly field: string
  readonly sqlExpression: string
  readonly operators: readonly string[]
  readonly facetable: boolean
  readonly sortable: boolean
}

const SCALAR_OPERATORS = ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'] as const
const DATE_OPERATORS = ['before', 'after', 'between', 'within_last'] as const

export const AUDIT_LOG_FILTER_BINDINGS: Readonly<Record<string, AuditLogFilterBinding>> = {
  'audit.action': {
    field: 'audit.action',
    sqlExpression: 'action',
    operators: SCALAR_OPERATORS,
    facetable: true,
    sortable: false,
  },
  'audit.resourceType': {
    field: 'audit.resourceType',
    sqlExpression: 'coalesce(target_type, entity_type)',
    operators: SCALAR_OPERATORS,
    facetable: true,
    sortable: false,
  },
  'audit.resourceId': {
    field: 'audit.resourceId',
    sqlExpression: 'coalesce(target_id, entity_id)',
    operators: SCALAR_OPERATORS,
    facetable: false,
    sortable: false,
  },
  'audit.actorId': {
    field: 'audit.actorId',
    sqlExpression: 'coalesce(actor_user_id, user_id)',
    operators: SCALAR_OPERATORS,
    facetable: false,
    sortable: false,
  },
  'audit.outcome': {
    field: 'audit.outcome',
    sqlExpression: 'outcome',
    operators: SCALAR_OPERATORS,
    facetable: true,
    sortable: false,
  },
  'audit.severity': {
    field: 'audit.severity',
    sqlExpression: 'severity',
    operators: SCALAR_OPERATORS,
    facetable: true,
    sortable: false,
  },
  'audit.requestId': {
    field: 'audit.requestId',
    sqlExpression: 'request_id',
    operators: SCALAR_OPERATORS,
    facetable: false,
    sortable: false,
  },
  'audit.traceId': {
    field: 'audit.traceId',
    sqlExpression: 'trace_id',
    operators: SCALAR_OPERATORS,
    facetable: false,
    sortable: false,
  },
  'audit.createdAt': {
    field: 'audit.createdAt',
    sqlExpression: 'occurred_at',
    operators: DATE_OPERATORS,
    facetable: false,
    sortable: true,
  },
  'audit.integrityState': {
    field: 'audit.integrityState',
    sqlExpression: "case when event_hash is null then 'unsealed' else 'sealed' end",
    operators: SCALAR_OPERATORS,
    facetable: true,
    sortable: false,
  },
}

const SAFE_TEXT_EXPRESSIONS = [
  'action',
  'event_name',
  'event_family',
  'module',
  'subsystem',
  'workflow',
  'stage',
  'severity',
  'outcome',
  'actor_type',
  'actor_role_surface',
  'request_id',
  'trace_id',
  'correlation_key',
  'retention_class',
  'coalesce(target_type, entity_type)',
  'coalesce(target_id, entity_id)',
] as const

function invalidCriteria(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}

function unsupportedCapability(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
}

function bindingFor(condition: FilterCondition): AuditLogFilterBinding {
  const binding = AUDIT_LOG_FILTER_BINDINGS[condition.field]
  if (!binding || !binding.operators.includes(condition.operator)) unsupportedCapability()
  return binding
}

function scalarValues(condition: FilterCondition): readonly (string | number | boolean)[] {
  if (condition.value?.kind === 'scalar') return [condition.value.value]
  if (condition.value?.kind === 'set' && condition.value.values.length > 0) {
    return condition.value.values
  }
  return invalidCriteria()
}

function canonicalSqlValue(value: string | number | boolean): string | number | boolean {
  return typeof value === 'string'
    ? value.trim().normalize('NFKC').toLocaleLowerCase('en-US')
    : value
}

function normalizedExpression(binding: AuditLogFilterBinding): string {
  return `lower((${binding.sqlExpression})::text)`
}

function scalarPredicate(
  condition: FilterCondition,
  binding: AuditLogFilterBinding
): AuditLogSqlFragment {
  const values = scalarValues(condition).map(canonicalSqlValue)
  const expression = normalizedExpression(binding)
  if (condition.operator === 'eq' || condition.operator === 'neq') {
    const value = values[0]
    if (value === undefined) return invalidCriteria()
    return {
      sql: `${expression} ${condition.operator === 'eq' ? '=' : '<>'} ?`,
      bindings: [value],
    }
  }
  if (condition.operator === 'in' || condition.operator === 'not_in') {
    return {
      sql: `${expression} ${condition.operator === 'in' ? 'in' : 'not in'} (${values
        .map(() => '?')
        .join(', ')})`,
      bindings: values,
    }
  }
  return unsupportedCapability()
}

function parseTimestamp(value: string | number | boolean | undefined): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalidCriteria()
  return new Date(value).toISOString()
}

function shiftRelativeTime(
  now: Date,
  amount: number,
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month'
): Date {
  if (!Number.isSafeInteger(amount) || amount < 1) return invalidCriteria()
  if (unit === 'month') {
    const shifted = new Date(now.getTime())
    const originalDay = shifted.getUTCDate()
    shifted.setUTCDate(1)
    shifted.setUTCMonth(shifted.getUTCMonth() - amount)
    const lastDay = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)
    ).getUTCDate()
    shifted.setUTCDate(Math.min(originalDay, lastDay))
    return shifted
  }
  const unitMs = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
  }[unit]
  return new Date(now.getTime() - amount * unitMs)
}

function datePredicate(
  condition: FilterCondition,
  binding: AuditLogFilterBinding,
  now: Date
): AuditLogSqlFragment {
  if (!Number.isFinite(now.getTime())) return invalidCriteria()
  const expression = binding.sqlExpression
  if (condition.operator === 'before' || condition.operator === 'after') {
    const value = condition.value?.kind === 'scalar' ? condition.value.value : undefined
    return {
      sql: `${expression} ${condition.operator === 'before' ? '<' : '>'} ?`,
      bindings: [parseTimestamp(value)],
    }
  }
  if (condition.operator === 'between' && condition.value?.kind === 'range') {
    const lower = condition.value.gte ?? condition.value.gt
    const upper = condition.value.lte ?? condition.value.lt
    if (lower === undefined || upper === undefined) return invalidCriteria()
    return {
      sql: `(${expression} ${condition.value.gte === undefined ? '>' : '>='} ? and ${expression} ${
        condition.value.lte === undefined ? '<' : '<='
      } ?)`,
      bindings: [parseTimestamp(lower), parseTimestamp(upper)],
    }
  }
  if (condition.operator === 'within_last' && condition.value?.kind === 'relative_time') {
    const lower = shiftRelativeTime(now, condition.value.amount, condition.value.unit)
    return {
      sql: `(${expression} >= ? and ${expression} <= ?)`,
      bindings: [lower.toISOString(), now.toISOString()],
    }
  }
  return invalidCriteria()
}

function conditionFragment(condition: FilterCondition, now: Date): AuditLogSqlFragment {
  const binding = bindingFor(condition)
  if (condition.operator === 'exists' || condition.operator === 'missing') {
    const predicate = `${binding.sqlExpression} IS ${condition.operator === 'exists' ? 'NOT ' : ''}NULL`
    return {
      sql: condition.effect === 'exclude' ? `(not (${predicate}))` : `(${predicate})`,
      bindings: [],
    }
  }

  const predicate =
    binding.field === 'audit.createdAt'
      ? datePredicate(condition, binding, now)
      : scalarPredicate(condition, binding)
  const resolved = condition.effect === 'exclude' ? `not (${predicate.sql})` : predicate.sql
  const unknown = `${binding.sqlExpression} IS NULL`
  return {
    sql:
      condition.unknown === 'include'
        ? `((${unknown}) or (${resolved}))`
        : `((not (${unknown})) and (${resolved}))`,
    bindings: predicate.bindings,
  }
}

export function compileAuditLogFilterExpression(
  expression: FilterExpression,
  now: Date
): AuditLogSqlFragment {
  if (expression.kind === 'condition') return conditionFragment(expression, now)
  if (expression.children.length === 0) return invalidCriteria()

  const children = expression.children.map((child) => compileAuditLogFilterExpression(child, now))
  const combined = children.map(({ sql }) => `(${sql})`).join(` ${expression.combinator} `)
  return {
    sql: expression.negated ? `(not (${combined}))` : `(${combined})`,
    bindings: children.flatMap(({ bindings }) => bindings),
  }
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replace(/[%_]/gu, '\\$&')
}

export function compileAuditLogTextSearch(value: string): AuditLogSqlFragment {
  const normalized = value.trim().normalize('NFKC')
  if (normalized.length === 0) return invalidCriteria()
  const pattern = `%${escapeLike(normalized)}%`
  return {
    sql: `(${SAFE_TEXT_EXPRESSIONS.map(
      (expression) => `(${expression})::text ilike ? escape '\\'`
    ).join(' or ')})`,
    bindings: SAFE_TEXT_EXPRESSIONS.map(() => pattern),
  }
}

function containsField(expression: FilterExpression, field: string): boolean {
  return expression.kind === 'condition'
    ? expression.field === field
    : expression.children.some((child) => containsField(child, field))
}

export interface AuditLogSelfExcludingReduction {
  readonly supported: boolean
  readonly expression?: FilterExpression
}

export function reduceAuditLogFilterForSelfExcludingFacet(
  expression: FilterExpression | undefined,
  field: string
): AuditLogSelfExcludingReduction {
  if (expression === undefined || !containsField(expression, field)) {
    return { supported: true, ...(expression === undefined ? {} : { expression }) }
  }
  if (expression.kind === 'condition') return { supported: true }
  if (expression.combinator !== 'and' || expression.negated) return { supported: false }
  if (expression.children.some((child) => child.kind === 'group' && containsField(child, field))) {
    return { supported: false }
  }

  const children = expression.children.filter(
    (child) => child.kind !== 'condition' || child.field !== field
  )
  if (children.length === 0) return { supported: true }
  if (children.length === 1) {
    const onlyChild = children[0]
    return onlyChild === undefined
      ? { supported: true }
      : { supported: true, expression: onlyChild }
  }
  return { supported: true, expression: { ...expression, children } }
}
