import type { estypes } from '@elastic/elasticsearch'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  FilterFacetGroup,
  FilterFacetTruth,
} from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  compileElasticsearchFilter,
  type ElasticsearchSemanticBindingType,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
type FilterFacetRequest = NonNullable<QueryCriteriaRequest['requestedFacets']>[number]
type FilterFacetCountMode = NonNullable<FilterFacetRequest['countMode']>

export interface ElasticsearchFacetPlan {
  readonly aggregationName: string
  readonly field: string
  readonly valueType: ElasticsearchSemanticBindingType
  readonly countMode: FilterFacetCountMode
  readonly selectedValues: readonly string[]
  readonly cursor?: string
  readonly truth: { readonly missing: boolean; readonly coverage: boolean }
  readonly query: estypes.QueryDslQueryContainer
  readonly aggregations: Readonly<Record<string, estypes.AggregationsAggregationContainer>>
  readonly runtimeMappings?: estypes.MappingRuntimeFields
}

export interface CompileElasticsearchFacetsInput {
  readonly requests: readonly FilterFacetRequest[]
  readonly mandatoryFilter?: FilterExpression
  readonly userFilter?: FilterExpression
  readonly textQuery?: estypes.QueryDslQueryContainer
  readonly bindings: ElasticsearchSemanticBindings
  readonly now: Date
  readonly maxValues: number
}

export interface CompiledElasticsearchFacets {
  readonly plans: readonly ElasticsearchFacetPlan[]
}

interface CompositeBucket {
  readonly key?: Readonly<Record<string, unknown>> | string
  readonly doc_count?: number
}

interface CompositeResult {
  readonly buckets?: readonly CompositeBucket[]
  readonly after_key?: Readonly<Record<string, unknown>>
}

interface FacetScopeResult {
  readonly doc_count?: number
  readonly values?: CompositeResult
  readonly missing?: { readonly doc_count?: number }
  readonly known?: { readonly doc_count?: number }
  readonly coverage?: { readonly value?: number | null }
}

interface FacetAggregationResult {
  readonly scope?: FacetScopeResult
}

export function compileElasticsearchFacets({
  requests,
  mandatoryFilter,
  userFilter,
  textQuery,
  bindings,
  now,
  maxValues,
}: CompileElasticsearchFacetsInput): CompiledElasticsearchFacets {
  if (!Number.isInteger(maxValues) || maxValues < 1 || maxValues > 1_000) criteriaError()

  const plans: ElasticsearchFacetPlan[] = []

  for (const [index, request] of requests.entries()) {
    const binding = bindings[request.field]
    if (binding === undefined || binding.facetable !== true) capabilityError()
    const countMode = request.countMode ?? 'constrained'
    const selectedValues = collectSelectedValues(userFilter, request.field)
    const applicableUserFilter =
      countMode === 'self_excluding' ? excludeRootAndField(userFilter, request.field) : userFilter
    const scopeExpression = composeFilters(mandatoryFilter, applicableUserFilter)
    const filters: estypes.QueryDslQueryContainer[] = []
    if (scopeExpression !== undefined) {
      filters.push(compileElasticsearchFilter(scopeExpression, bindings, now))
    }
    if (textQuery !== undefined) filters.push(textQuery)
    const scopeQuery: estypes.QueryDslQueryContainer =
      filters.length === 0 ? { match_all: {} } : { bool: { filter: filters } }
    const after = decodeFacetCursor(request.cursor)
    const aggregationName = `facet_${index}`
    const valueSearch = request.valueSearch?.trim().toLocaleLowerCase()
    const runtimeField = `${aggregationName}_searched_value`
    const valuePath =
      valueSearch === undefined || valueSearch.length === 0 ? binding.path : runtimeField
    const runtimeMappings: estypes.MappingRuntimeFields | undefined =
      valuePath === binding.path
        ? undefined
        : {
            [runtimeField]: {
              type: 'keyword',
              script: {
                source:
                  'if (doc.containsKey(params.field) && !doc[params.field].empty) { for (def value : doc[params.field]) { if (value.toString().toLowerCase(Locale.ROOT).contains(params.needle)) emit(value); } }',
                params: { field: binding.path, needle: valueSearch },
              },
            },
          }
    const facetAggregations: Readonly<Record<string, estypes.AggregationsAggregationContainer>> = {
      values: {
        composite: {
          size: maxValues,
          sources: [{ value: { terms: { field: valuePath } } }],
          ...(after === undefined ? {} : { after }),
        },
      },
      missing: { missing: { field: binding.path } },
      known: { filter: { exists: { field: binding.presencePath ?? binding.path } } },
    }
    plans.push({
      aggregationName,
      field: request.field,
      valueType: binding.type,
      countMode,
      selectedValues,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      truth: {
        missing: binding.exposeMissingCount === true,
        coverage: binding.exposeCoverage === true,
      },
      query: scopeQuery,
      aggregations: facetAggregations,
      ...(runtimeMappings === undefined ? {} : { runtimeMappings }),
    })
  }

  return { plans }
}

export function parseElasticsearchFacetResponse(
  plans: readonly ElasticsearchFacetPlan[],
  aggregations: Readonly<Record<string, unknown>> | undefined,
  countRelation: 'exact' | 'approximate' = 'exact'
): FilterFacetGroup[] {
  return plans.map((plan) => {
    const result = aggregations?.[plan.aggregationName] as FacetAggregationResult | undefined
    const scope = result?.scope
    const values = new Map<
      string,
      {
        value: string
        count: number
        countRelation: 'exact' | 'approximate'
        selected: boolean
      }
    >()
    for (const bucket of scope?.values?.buckets ?? []) {
      const raw = typeof bucket.key === 'string' ? bucket.key : bucket.key?.['value']
      const value = normalizeFacetValue(raw, plan.valueType)
      const count = bucket.doc_count
      if (
        value === undefined ||
        !Number.isSafeInteger(count) ||
        count === undefined ||
        count < 0
      ) {
        responseError()
      }
        values.set(value, {
          value,
          count,
          countRelation,
          selected: plan.selectedValues.includes(value),
        })
    }
    if (plan.cursor === undefined) {
      for (const selected of plan.selectedValues) {
        const current = values.get(selected)
        if (current !== undefined) current.selected = true
        else {
          values.set(selected, {
            value: selected,
            count: 0,
            countRelation,
            selected: true,
          })
        }
      }
    }
    const sorted = [...values.values()].sort(
      (left, right) => right.count - left.count || left.value.localeCompare(right.value)
    )
    const afterKey = scope?.values?.after_key
    const truth = parseFacetTruth(scope, plan, countRelation)
    return {
      field: plan.field,
      countMode: plan.countMode,
      values: sorted,
      ...(afterKey === undefined ? {} : { nextCursor: encodeFacetCursor(afterKey) }),
      ...(truth === undefined ? {} : { truth }),
    }
  })
}

function normalizeFacetValue(
  raw: unknown,
  valueType: ElasticsearchSemanticBindingType
): string | undefined {
  if (typeof raw === 'string') return raw
  if (valueType !== 'date_time' || typeof raw !== 'number' || !Number.isFinite(raw)) {
    return undefined
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function parseFacetTruth(
  scope: FacetScopeResult | undefined,
  plan: ElasticsearchFacetPlan,
  countRelation: 'exact' | 'approximate'
): FilterFacetTruth | undefined {
  if (!plan.truth.missing && !plan.truth.coverage) return undefined
  const total = scope?.doc_count
  const aggregateMissing = scope?.missing?.doc_count
  const known = scope?.known?.doc_count
  if (
    !Number.isSafeInteger(total) ||
    total === undefined ||
    total < 0 ||
    !Number.isSafeInteger(aggregateMissing) ||
    aggregateMissing === undefined ||
    aggregateMissing < 0 ||
    aggregateMissing > total ||
    !Number.isSafeInteger(known) ||
    known === undefined ||
    known < 0 ||
    known > total
  ) {
    responseError()
  }
  const documentsWithValue = total - aggregateMissing
  const knownMissing = known - documentsWithValue
  if (knownMissing < 0) responseError()
  return {
    ...(plan.truth.missing ? { missing: { value: knownMissing, countRelation } } : {}),
    ...(plan.truth.coverage
      ? {
          coverage: {
            known,
            total,
            ratio: total === 0 ? 1 : known / total,
            countRelation,
          },
        }
      : {}),
  }
}

function excludeRootAndField(
  expression: FilterExpression | undefined,
  field: string
): FilterExpression | undefined {
  if (expression === undefined) return undefined
  if (expression.kind === 'condition') return expression.field === field ? undefined : expression
  const containsField = expressionContainsField(expression, field)
  if (!containsField) return expression
  if (expression.combinator !== 'and' || expression.negated === true) capabilityError()
  const extractableChildren = expression.children.filter((child) => {
    if (!expressionContainsField(child, field)) return true
    if (child.kind === 'condition' && child.field === field) return false
    if (
      child.kind === 'group' &&
      child.combinator === 'or' &&
      child.negated !== true &&
      child.children.length > 0 &&
      child.children.every((nested) => nested.kind === 'condition' && nested.field === field)
    ) {
      return false
    }
    capabilityError()
  })
  if (extractableChildren.length === 0) return undefined
  if (extractableChildren.length === 1) return extractableChildren[0]
  return { ...expression, children: extractableChildren }
}

function expressionContainsField(expression: FilterExpression, field: string): boolean {
  if (expression.kind === 'condition') return expression.field === field
  return expression.children.some((child) => expressionContainsField(child, field))
}

function collectSelectedValues(expression: FilterExpression | undefined, field: string): string[] {
  if (expression === undefined) return []
  if (expression.kind === 'group') {
    return deduplicate(expression.children.flatMap((child) => collectSelectedValues(child, field)))
  }
  if (expression.field !== field || expression.effect !== 'require') return []
  if (expression.value?.kind === 'set') return expression.value.values.map(String)
  if (expression.value?.kind === 'scalar') return [String(expression.value.value)]
  if (expression.value?.kind === 'hierarchy') return expression.value.termIds
  return []
}

function composeFilters(
  mandatoryFilter: FilterExpression | undefined,
  userFilter: FilterExpression | undefined
): FilterExpression | undefined {
  if (mandatoryFilter === undefined) return userFilter
  if (userFilter === undefined) return mandatoryFilter
  return { kind: 'group', combinator: 'and', children: [mandatoryFilter, userFilter] }
}

function encodeFacetCursor(afterKey: Readonly<Record<string, unknown>>): string {
  return Buffer.from(JSON.stringify({ version: 1, afterKey }), 'utf8').toString('base64url')
}

function decodeFacetCursor(
  cursor: string | undefined
): Readonly<Record<string, unknown>> | undefined {
  if (cursor === undefined) return undefined
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) criteriaError()
    const decoded = Buffer.from(cursor, 'base64url')
    if (decoded.toString('base64url') !== cursor) criteriaError()
    const parsed = JSON.parse(decoded.toString('utf8')) as {
      version?: unknown
      afterKey?: unknown
    }
    if (
      parsed.version !== 1 ||
      parsed.afterKey === null ||
      typeof parsed.afterKey !== 'object' ||
      Array.isArray(parsed.afterKey)
    ) {
      criteriaError()
    }
    const afterKey = parsed.afterKey as Readonly<Record<string, unknown>>
    if (
      Object.keys(afterKey).length !== 1 ||
      (typeof afterKey['value'] !== 'string' && typeof afterKey['value'] !== 'number')
    ) {
      criteriaError()
    }
    return afterKey
  } catch (error) {
    if (error instanceof FilterExecutionError) throw error
    criteriaError()
  }
}

function deduplicate(values: readonly string[]): string[] {
  return [...new Map(values.map((value) => [value.toLocaleLowerCase(), value])).values()]
}

function capabilityError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
}

function criteriaError(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}

function responseError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_RESPONSE_INVALID')
}
