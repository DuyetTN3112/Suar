import type { estypes } from '@elastic/elasticsearch'

import {
  compileKnownPredicate,
  capabilityError,
  criteriaError,
} from './elasticsearch_filter_predicate_builder.js'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
type FilterCondition = Extract<FilterExpression, { kind: 'condition' }>

export type ElasticsearchSemanticBindingType =
  | 'scalar'
  | 'multi_value'
  | 'number'
  | 'date_time'
  | 'hierarchy'
  | 'relation'
  | 'boolean'
  | 'text'

export interface ElasticsearchSemanticBinding {
  readonly type: ElasticsearchSemanticBindingType
  readonly path: string
  readonly presencePath?: string
  readonly cardinalityPath?: string
  readonly ancestorPath?: string
  readonly facetable?: boolean
  readonly sortable?: boolean
  readonly exposeMissingCount?: boolean
  readonly exposeCoverage?: boolean
  readonly relationBindings?: ElasticsearchSemanticBindings
}

export type ElasticsearchSemanticBindings = Readonly<Record<string, ElasticsearchSemanticBinding>>

const OPERATORS: Readonly<Record<ElasticsearchSemanticBindingType, ReadonlySet<string>>> = {
  scalar: new Set(['eq', 'neq', 'in', 'not_in', 'exists', 'missing', 'is_unknown']),
  multi_value: new Set([
    'contains_any',
    'contains_all',
    'contains_none',
    'contains_exactly',
    'contains_at_least',
    'is_empty',
    'exists',
    'missing',
    'is_unknown',
  ]),
  number: new Set([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'outside',
    'exists',
    'missing',
    'is_unknown',
  ]),
  date_time: new Set([
    'before',
    'after',
    'between',
    'within_last',
    'within_next',
    'overdue',
    'exists',
    'missing',
    'is_unknown',
  ]),
  hierarchy: new Set([
    'is',
    'is_any',
    'within_subtree',
    'has_ancestor',
    'exists',
    'missing',
    'is_unknown',
  ]),
  relation: new Set([
    'related_exists',
    'related_missing',
    'related_count',
    'related_matches',
    'exists',
    'missing',
    'is_unknown',
  ]),
  boolean: new Set(['eq', 'neq', 'is_true', 'is_false', 'exists', 'missing', 'is_unknown']),
  text: new Set(['exact', 'contains', 'prefix', 'exists', 'missing', 'is_unknown']),
}

export function elasticsearchOperatorsForBindings(
  bindings: ElasticsearchSemanticBindings
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    Object.entries(bindings).map(([field, binding]) => [field, [...OPERATORS[binding.type]]])
  )
}

export function compileElasticsearchFilter(
  expression: FilterExpression,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  if (!Number.isFinite(now.getTime())) criteriaError()
  return compileExpression(expression, bindings, now)
}

function compileExpression(
  expression: FilterExpression,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  if (expression.kind === 'condition') return compileCondition(expression, bindings, now)
  if (expression.children.length === 0) criteriaError()

  const children = expression.children.map((child) => compileExpression(child, bindings, now))
  const combined: estypes.QueryDslQueryContainer =
    expression.combinator === 'and'
      ? { bool: { filter: children } }
      : { bool: { should: children, minimum_should_match: 1 } }

  return expression.negated ? { bool: { must_not: [combined] } } : combined
}

function compileCondition(
  condition: FilterCondition,
  bindings: ElasticsearchSemanticBindings,
  now: Date
): estypes.QueryDslQueryContainer {
  const binding = bindings[condition.field]
  if (binding === undefined || !OPERATORS[binding.type].has(condition.operator)) capabilityError()

  const actualExists: estypes.QueryDslQueryContainer = { exists: { field: binding.path } }
  const known: estypes.QueryDslQueryContainer = {
    exists: { field: binding.presencePath ?? binding.path },
  }
  if (condition.operator === 'exists') return applyEffect(actualExists, condition.effect)
  if (condition.operator === 'missing') {
    return applyEffect({ bool: { must_not: [actualExists] } }, condition.effect)
  }
  if (condition.operator === 'is_unknown') {
    return applyEffect({ bool: { must_not: [known] } }, condition.effect)
  }

  const predicate = compileKnownPredicate(condition, binding, now, compileExpression)
  const effected = applyEffect(predicate, condition.effect)
  return condition.unknown === 'include'
    ? { bool: { should: [{ bool: { must_not: [known] } }, effected], minimum_should_match: 1 } }
    : { bool: { filter: [known, effected] } }
}

function applyEffect(
  query: estypes.QueryDslQueryContainer,
  effect: 'require' | 'exclude'
): estypes.QueryDslQueryContainer {
  return effect === 'exclude' ? { bool: { must_not: [query] } } : query
}
