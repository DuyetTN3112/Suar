import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type {
  FilterAuthorizationBinding,
  FilterExecutorCapabilities,
  FilterExecutorInput,
  FilterExecutorResult,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  canonicalFilterScalarIdentity,
  canonicalFilterString,
  evaluateSetOperator,
  resolveRelativeTimeRange,
} from '#modules/filtering/domain/filtering-core/filter_operators'
import {
  evaluateFilterExpression,
  scoreFilterPreferences,
  type FilterTruth,
} from '#modules/filtering/domain/filtering-core/filter_truth'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

export type ReferenceSpecialValue =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'hierarchy'
      readonly termIds: readonly string[]
      readonly ancestorIds: readonly string[]
    }
  | { readonly kind: 'relation'; readonly records: readonly ReferenceFilterRecord[] }

export type ReferenceFieldValue = FilterScalar | readonly FilterScalar[] | ReferenceSpecialValue

export interface ReferenceFilterRecord {
  readonly id: string
  readonly fields: Readonly<Record<string, ReferenceFieldValue>>
}

export interface ReferenceFilterEvaluatorOptions {
  readonly records: readonly ReferenceFilterRecord[]
  readonly profile?: string
  readonly cursorSecret?: string
  readonly cursorTtlMs?: number
  readonly clock?: () => Date
  readonly total?:
    | { readonly relation: 'eq' }
    | { readonly relation: 'gte'; readonly bound: number }
    | { readonly relation: 'unknown' }
  readonly degraded?: boolean
  readonly partial?: boolean
}

interface ResolvedField {
  state: 'known' | 'unknown' | 'missing' | 'hidden'
  value?: Exclude<ReferenceFieldValue, ReferenceSpecialValue> | ReferenceSpecialValue
}

interface CursorPayload {
  v: 1
  criteriaHash: string
  authorizationHash: string
  position: number
  expiresAt: number
}

interface SelfExcludingReduction {
  supported: boolean
  expression?: FilterExpression
}

const DEFAULT_CURSOR_SECRET = 'reference-filter-conformance-cursor-secret-v1'
const DEFAULT_NOW = new Date('2026-08-01T00:00:00.000Z')
const MAX_REFERENCE_RECORDS = 10_000

export class ReferenceFilterEvaluator implements FilterQueryExecutor<ReferenceFilterRecord> {
  readonly profile: string
  readonly #records: readonly ReferenceFilterRecord[]
  readonly #cursorSecret: string
  readonly #cursorTtlMs: number
  readonly #clock: () => Date
  readonly #totalPolicy: NonNullable<ReferenceFilterEvaluatorOptions['total']>
  readonly #degraded: boolean
  readonly #partial: boolean

  constructor(options: ReferenceFilterEvaluatorOptions) {
    if (
      options.records.length > MAX_REFERENCE_RECORDS ||
      options.records.some((record) => !isReferenceRecord(record)) ||
      new Set(options.records.map(({ id }) => id)).size !== options.records.length
    ) {
      throw new TypeError('Invalid reference filter dataset')
    }
    const profile = options.profile ?? 'reference-filter'
    const cursorSecret = options.cursorSecret ?? DEFAULT_CURSOR_SECRET
    const cursorTtlMs = options.cursorTtlMs ?? 60_000
    if (
      profile.trim().length === 0 ||
      profile.length > 128 ||
      cursorSecret.length < 32 ||
      !Number.isSafeInteger(cursorTtlMs) ||
      cursorTtlMs < 1
    ) {
      throw new TypeError('Invalid reference filter evaluator options')
    }
    this.profile = profile
    this.#records = structuredClone(options.records)
    this.#cursorSecret = cursorSecret
    this.#cursorTtlMs = cursorTtlMs
    this.#clock = options.clock ?? (() => new Date(DEFAULT_NOW))
    this.#totalPolicy = options.total ?? { relation: 'eq' }
    this.#degraded = options.degraded ?? false
    this.#partial = options.partial ?? false
  }

  describeCapabilities(): FilterExecutorCapabilities {
    return {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: true,
      relativeTime: true,
      relations: true,
      pagination: ['cursor', 'offset', 'bounded'],
      facetCountModes: ['constrained', 'self_excluding'],
      totalRelations: ['eq', 'gte', 'unknown'],
      maxDepth: 8,
      maxConditions: 200,
      maxPageSize: 500,
      maxFacetRequests: 50,
      maxProjectionFields: 100,
      maxSorts: 8,
      maxCost: 10_000,
      fieldOperators: {
        tenant: ['eq', 'neq', 'in', 'not_in'],
        status: ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'],
        title: ['exact', 'contains', 'prefix'],
        skills: [
          'contains_any',
          'contains_all',
          'contains_none',
          'contains_exactly',
          'contains_at_least',
          'is_empty',
        ],
        score: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'outside'],
        createdAt: ['before', 'after', 'between', 'within_last', 'within_next', 'overdue'],
        category: ['is', 'is_any', 'within_subtree', 'has_ancestor'],
        active: ['is_true', 'is_false', 'is_unknown'],
        applications: ['related_exists', 'related_missing', 'related_count', 'related_matches'],
      },
    }
  }

  estimateCost(input: FilterExecutorInput): Promise<number> {
    const conditions = countConditions(input.eligibilityFilter ?? input.criteria.filter)
    return Promise.resolve(
      conditions + (input.criteria.requestedFacets?.length ?? 0) * 2 + input.criteria.page.size / 10
    )
  }

  async execute(input: FilterExecutorInput): Promise<FilterExecutorResult<ReferenceFilterRecord>> {
    await Promise.resolve()
    if (input.signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
    const now = this.#clock()
    if (!Number.isFinite(now.getTime())) throw new FilterExecutionError('FILTER_CRITERIA_INVALID')

    const eligible = this.#records.filter((record) => this.#recordMatches(record, input, now))
    const ranked = this.#sortRecords(eligible, input.criteria, now)
    const offset = this.#resolveOffset(input, now)
    const pageSize = input.criteria.page.size
    const hits = ranked.slice(offset, offset + pageSize)
    const facets = this.#buildFacets(input, now)
    const nextPosition = offset + hits.length
    const page = {
      ...(nextPosition < ranked.length
        ? { nextCursor: this.#encodeCursor(input, nextPosition, now) }
        : {}),
      ...(offset > 0
        ? { previousCursor: this.#encodeCursor(input, Math.max(0, offset - pageSize), now) }
        : {}),
    }
    const diagnostics =
      this.#degraded || this.#partial
        ? ([{ code: 'FILTER_PROVIDER_DEGRADED', severity: 'warning' }] as const)
        : []

    if (input.signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
    return {
      hits,
      total: this.#totalFor(eligible.length),
      facets,
      suggestions: [],
      diagnostics,
      page,
      provider: this.profile,
      degraded: this.#degraded,
      partial: this.#partial,
      authorizationEvidence: authorizationEvidence(input.authorizationBinding),
    }
  }

  createConformanceInput(overrides: Partial<FilterExecutorInput> = {}): FilterExecutorInput {
    const definition = referenceDefinition(this.profile)
    const criteria: QueryCriteriaRequest = {
      context: definition.key,
      schemaVersion: definition.version,
      sort: [{ field: 'id', direction: 'asc' }],
      page: { size: 500 },
    }
    const authorizationBinding = asAuthorizationBinding({
      context: definition.key,
      schemaVersion: definition.version,
      authorizationVersion: 'reference-authorization-v1',
      mandatoryFingerprint: 'mandatory-hash',
      eligibilityFingerprint: 'eligibility-hash',
      effectiveContextFingerprint: 'context-hash',
    })
    return {
      definition,
      criteria,
      authorizationBinding,
      requestId: 'reference-request-1',
      ...overrides,
    }
  }

  #recordMatches(record: ReferenceFilterRecord, input: FilterExecutorInput, now: Date): boolean {
    if (!matchesText(record, input.criteria.text?.value)) return false
    if (
      input.mandatoryFilter !== undefined &&
      !evaluateReferenceExpression(input.mandatoryFilter, record, now)
    ) {
      return false
    }
    const eligibility = input.eligibilityFilter ?? input.criteria.filter
    return eligibility === undefined || evaluateReferenceExpression(eligibility, record, now)
  }

  #sortRecords(
    records: readonly ReferenceFilterRecord[],
    criteria: QueryCriteriaRequest,
    now: Date
  ): ReferenceFilterRecord[] {
    const preferenceScores = new Map<string, number>()
    for (const record of records) {
      const score = scoreFilterPreferences(
        criteria.preferences ?? [],
        (condition) => referencePredicate(condition, record, now),
        {
          minWeight: 0,
          maxWeight: 10,
          maxPreferenceScore: 20,
          explicitSortDisablesRelevance: criteria.sort.length > 0,
        }
      ).score
      preferenceScores.set(record.id, score)
    }
    return [...records].sort((left, right) => {
      if (criteria.sort.length === 0) {
        const scoreDifference =
          (preferenceScores.get(right.id) ?? 0) - (preferenceScores.get(left.id) ?? 0)
        if (scoreDifference !== 0) return scoreDifference
      }
      for (const sort of criteria.sort) {
        const compared = compareField(left, right, sort.field)
        if (compared !== 0) return sort.direction === 'asc' ? compared : -compared
      }
      return left.id.localeCompare(right.id)
    })
  }

  #resolveOffset(input: FilterExecutorInput, now: Date): number {
    const { cursor, offset } = input.criteria.page
    if (cursor !== undefined && offset !== undefined) {
      throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
    }
    if (cursor !== undefined) return this.#decodeCursor(input, cursor, now).position
    return offset ?? 0
  }

  #totalFor(exact: number): FilterExecutorResult['total'] {
    if (this.#totalPolicy.relation === 'eq') return { value: exact, relation: 'eq' }
    if (this.#totalPolicy.relation === 'unknown') return { value: 0, relation: 'unknown' }
    return { value: Math.min(exact, Math.max(0, this.#totalPolicy.bound)), relation: 'gte' }
  }

  #buildFacets(input: FilterExecutorInput, now: Date): FilterFacetGroup[] {
    return (input.criteria.requestedFacets ?? []).map((request) => {
      if (request.cursor !== undefined) throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
      let userExpression = input.criteria.filter
      if (request.countMode === 'self_excluding') {
        const reduction = reduceForSelfExcludingFacet(userExpression, request.field)
        if (!reduction.supported) {
          throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
        }
        userExpression = reduction.expression
      }
      const population = this.#records.filter((record) => {
        if (!matchesText(record, input.criteria.text?.value)) return false
        if (
          input.mandatoryFilter !== undefined &&
          !evaluateReferenceExpression(input.mandatoryFilter, record, now)
        ) {
          return false
        }
        return (
          userExpression === undefined || evaluateReferenceExpression(userExpression, record, now)
        )
      })
      const counts = new Map<string, number>()
      for (const record of population) {
        const bucketValues = new Set(facetValues(record, request.field))
        for (const value of bucketValues) counts.set(value, (counts.get(value) ?? 0) + 1)
      }
      const selected = selectedFacetValues(input.criteria.filter, request.field)
      for (const value of selected) if (!counts.has(value)) counts.set(value, 0)
      const valueSearch = request.valueSearch && canonicalFilterString(request.valueSearch)
      const values = [...counts]
        .filter(([value]) => valueSearch === undefined || value.includes(valueSearch))
        .sort(([leftValue, leftCount], [rightValue, rightCount]) => {
          const countDifference = rightCount - leftCount
          return countDifference === 0 ? leftValue.localeCompare(rightValue) : countDifference
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
    })
  }

  #encodeCursor(input: FilterExecutorInput, position: number, now: Date): string {
    const payload: CursorPayload = {
      v: 1,
      criteriaHash: criteriaHash(input),
      authorizationHash: authorizationHash(input.authorizationBinding),
      position,
      expiresAt: now.getTime() + this.#cursorTtlMs,
    }
    const body = Buffer.from(stableJson(payload), 'utf8').toString('base64url')
    const signature = createHmac('sha256', this.#cursorSecret).update(body).digest('base64url')
    return `rfc1.${body}.${signature}`
  }

  #decodeCursor(input: FilterExecutorInput, cursor: string, now: Date): CursorPayload {
    const [prefix, body, signature, extra] = cursor.split('.')
    if (prefix !== 'rfc1' || body === undefined || signature === undefined || extra !== undefined) {
      throw new FilterExecutionError('FILTER_CURSOR_INVALID')
    }
    const expected = createHmac('sha256', this.#cursorSecret).update(body).digest()
    let supplied: Buffer
    try {
      supplied = Buffer.from(signature, 'base64url')
    } catch {
      throw new FilterExecutionError('FILTER_CURSOR_INVALID')
    }
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new FilterExecutionError('FILTER_CURSOR_INVALID')
    }
    let payload: unknown
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    } catch {
      throw new FilterExecutionError('FILTER_CURSOR_INVALID')
    }
    if (
      !isCursorPayload(payload) ||
      payload.criteriaHash !== criteriaHash(input) ||
      payload.authorizationHash !== authorizationHash(input.authorizationBinding)
    ) {
      throw new FilterExecutionError('FILTER_CURSOR_INVALID')
    }
    if (payload.expiresAt < now.getTime()) throw new FilterExecutionError('FILTER_CURSOR_EXPIRED')
    return payload
  }
}

export function referenceDefinition(profile = 'reference-filter'): FilterContextDefinition {
  return {
    key: 'filter.reference.conformance',
    version: 1,
    resource: 'reference_record',
    ownerModule: 'filtering',
    capabilities: {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: true,
      relativeTime: true,
      savedViews: false,
      sharedViews: false,
      alerts: false,
      emptyRequest: true,
      pagination: 'cursor',
      maxDepth: 6,
      maxConditions: 100,
    },
    fields: [],
    sorts: [],
    defaultSort: [],
    executionProfile: profile,
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 500,
      maxFacetRequests: 50,
      maxProjectionFields: 100,
      maxSorts: 8,
      maxSetValues: 200,
      maxTextLength: 1_024,
      maxRelationDepth: 4,
      maxCost: 10_000,
    },
  }
}

export function referenceAuthorizationBinding(
  overrides: Partial<FilterAuthorizationBinding> = {}
): FilterAuthorizationBinding {
  return asAuthorizationBinding({
    context: 'filter.reference.conformance',
    schemaVersion: 1,
    authorizationVersion: 'authorization-v1',
    mandatoryFingerprint: 'mandatory-fingerprint',
    eligibilityFingerprint: 'eligibility-fingerprint',
    effectiveContextFingerprint: 'context-fingerprint',
    ...overrides,
  })
}

function asAuthorizationBinding(
  value: Omit<FilterAuthorizationBinding, keyof FilterAuthorizationBinding & symbol>
): FilterAuthorizationBinding {
  return value as FilterAuthorizationBinding
}

function isReferenceRecord(value: unknown): value is ReferenceFilterRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record['id'] === 'string' &&
    record['id'].length > 0 &&
    record['id'].length <= 512 &&
    record['fields'] !== null &&
    typeof record['fields'] === 'object' &&
    !Array.isArray(record['fields'])
  )
}

function authorizationEvidence(binding: FilterAuthorizationBinding) {
  return {
    hits: binding,
    total: binding,
    facets: binding,
    suggestions: binding,
    page: binding,
  }
}

function evaluateReferenceExpression(
  expression: FilterExpression,
  record: ReferenceFilterRecord,
  now: Date
): boolean {
  return evaluateFilterExpression(expression, (condition) =>
    referencePredicate(condition, record, now)
  )
}

function referencePredicate(
  condition: FilterCondition,
  record: ReferenceFilterRecord,
  now: Date
): FilterTruth {
  const resolved = resolveField(record, condition.field)
  const operator = condition.operator
  if (operator === 'exists') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    return resolved.state === 'missing' ? 'false' : 'true'
  }
  if (operator === 'missing') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    return resolved.state === 'missing' ? 'true' : 'false'
  }
  if (operator === 'is_unknown') {
    return resolved.state === 'unknown' || resolved.state === 'hidden' ? 'true' : 'false'
  }
  if (operator === 'related_exists' || operator === 'related_missing') {
    if (resolved.state === 'unknown' || resolved.state === 'hidden') return 'unknown'
    if (resolved.state === 'missing') return operator === 'related_missing' ? 'true' : 'false'
  }
  if (resolved.state !== 'known' || resolved.value === undefined) return 'unknown'

  if (operator.startsWith('contains_') || operator === 'is_empty') {
    if (!Array.isArray(resolved.value)) return 'unknown'
    const selected = condition.value?.kind === 'set' ? condition.value.values : []
    return evaluateSetOperator(
      operator as Parameters<typeof evaluateSetOperator>[0],
      resolved.value,
      selected,
      condition.value?.kind === 'set' ? condition.value.minimumMatch : undefined
    )
  }
  if (['eq', 'neq', 'in', 'not_in'].includes(operator)) {
    const actual = scalarValue(resolved.value)
    if (actual === undefined) return 'unknown'
    const selected =
      condition.value?.kind === 'set'
        ? condition.value.values
        : condition.value?.kind === 'scalar'
          ? [condition.value.value]
          : []
    const matches = selected.some(
      (value) => canonicalFilterScalarIdentity(value) === canonicalFilterScalarIdentity(actual)
    )
    return operator === 'neq' || operator === 'not_in'
      ? matches
        ? 'false'
        : 'true'
      : matches
        ? 'true'
        : 'false'
  }
  if (operator === 'between' && typeof scalarValue(resolved.value) === 'string') {
    return compareDatePredicate(operator, resolved.value, condition, now)
  }
  if (['gt', 'gte', 'lt', 'lte', 'between', 'outside'].includes(operator)) {
    return compareRangePredicate(operator, resolved.value, condition)
  }
  if (['before', 'after', 'between', 'within_last', 'within_next', 'overdue'].includes(operator)) {
    return compareDatePredicate(operator, resolved.value, condition, now)
  }
  if (['exact', 'contains', 'prefix'].includes(operator)) {
    const actual = scalarValue(resolved.value)
    const selected = condition.value?.kind === 'scalar' ? condition.value.value : undefined
    if (typeof actual !== 'string' || typeof selected !== 'string') return 'unknown'
    const haystack = canonicalFilterString(actual)
    const needle = canonicalFilterString(selected)
    const matches =
      operator === 'exact'
        ? haystack === needle
        : operator === 'contains'
          ? haystack.includes(needle)
          : haystack.startsWith(needle)
    return matches ? 'true' : 'false'
  }
  if (['is', 'is_any', 'within_subtree', 'has_ancestor'].includes(operator)) {
    return hierarchyPredicate(operator, resolved.value, condition)
  }
  if (operator === 'is_true' || operator === 'is_false') {
    const actual = scalarValue(resolved.value)
    if (typeof actual !== 'boolean') return 'unknown'
    return actual === (operator === 'is_true') ? 'true' : 'false'
  }
  if (operator.startsWith('related_')) {
    return relationPredicate(operator, resolved.value, condition, now)
  }
  return 'unknown'
}

function resolveField(record: ReferenceFilterRecord, field: string): ResolvedField {
  if (field === 'id') return { state: 'known', value: record.id }
  if (!Object.hasOwn(record.fields, field)) return { state: 'unknown' }
  const value = record.fields[field]
  if (value === undefined) return { state: 'unknown' }
  if (isSpecialValue(value, 'unknown')) return { state: 'unknown' }
  if (isSpecialValue(value, 'missing')) return { state: 'missing' }
  if (isSpecialValue(value, 'hidden')) return { state: 'hidden' }
  return { state: 'known', value }
}

function isSpecialValue(
  value: ReferenceFieldValue | undefined,
  kind: ReferenceSpecialValue['kind']
): boolean {
  return isSpecialObject(value) && value.kind === kind
}

function isSpecialObject(value: unknown): value is ReferenceSpecialValue {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'kind' in value &&
    typeof value.kind === 'string'
  )
}

function scalarValue(value: ResolvedField['value']): FilterScalar | undefined {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : undefined
}

function compareRangePredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition
): FilterTruth {
  const actual = scalarValue(actualValue)
  if (typeof actual !== 'number') return 'unknown'
  if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'number') {
    const selected = condition.value.value
    const matches = {
      gt: actual > selected,
      gte: actual >= selected,
      lt: actual < selected,
      lte: actual <= selected,
    }[operator]
    return matches ? 'true' : 'false'
  }
  if (condition.value?.kind !== 'range') return 'unknown'
  const lower = condition.value.gte ?? condition.value.gt
  const upper = condition.value.lte ?? condition.value.lt
  if (
    (lower !== undefined && typeof lower !== 'number') ||
    (upper !== undefined && typeof upper !== 'number')
  ) {
    return 'unknown'
  }
  const withinLower =
    lower === undefined || (condition.value.gte !== undefined ? actual >= lower : actual > lower)
  const withinUpper =
    upper === undefined || (condition.value.lte !== undefined ? actual <= upper : actual < upper)
  const within = withinLower && withinUpper
  return operator === 'outside' ? (within ? 'false' : 'true') : within ? 'true' : 'false'
}

function compareDatePredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition,
  now: Date
): FilterTruth {
  const actual = scalarValue(actualValue)
  if (typeof actual !== 'string') return 'unknown'
  const timestamp = Date.parse(actual)
  if (!Number.isFinite(timestamp)) return 'unknown'
  if (operator === 'overdue') return timestamp < now.getTime() ? 'true' : 'false'
  if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'string') {
    const selected = Date.parse(condition.value.value)
    if (!Number.isFinite(selected)) return 'unknown'
    return operator === 'before'
      ? timestamp < selected
        ? 'true'
        : 'false'
      : timestamp > selected
        ? 'true'
        : 'false'
  }
  if (
    (operator === 'within_last' || operator === 'within_next') &&
    condition.value?.kind === 'relative_time'
  ) {
    const range = resolveRelativeTimeRange(condition.value, operator, now)
    return timestamp >= Date.parse(range.gte) && timestamp <= Date.parse(range.lte)
      ? 'true'
      : 'false'
  }
  if (condition.value?.kind === 'range') {
    const lower = condition.value.gte ?? condition.value.gt
    const upper = condition.value.lte ?? condition.value.lt
    if (
      (lower !== undefined && typeof lower !== 'string') ||
      (upper !== undefined && typeof upper !== 'string')
    ) {
      return 'unknown'
    }
    const withinLower =
      lower === undefined ||
      (condition.value.gte !== undefined
        ? timestamp >= Date.parse(lower)
        : timestamp > Date.parse(lower))
    const withinUpper =
      upper === undefined ||
      (condition.value.lte !== undefined
        ? timestamp <= Date.parse(upper)
        : timestamp < Date.parse(upper))
    return withinLower && withinUpper ? 'true' : 'false'
  }
  return 'unknown'
}

function hierarchyPredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition
): FilterTruth {
  if (
    !isSpecialObject(actualValue) ||
    actualValue.kind !== 'hierarchy' ||
    condition.value?.kind !== 'hierarchy'
  ) {
    return 'unknown'
  }
  const terms = new Set(actualValue.termIds.map(canonicalFilterString))
  const ancestors = new Set(actualValue.ancestorIds.map(canonicalFilterString))
  const selected = condition.value.termIds.map(canonicalFilterString)
  const matches =
    operator === 'is'
      ? selected.length === terms.size && selected.every((term) => terms.has(term))
      : operator === 'is_any'
        ? selected.some((term) => terms.has(term))
        : operator === 'within_subtree'
          ? selected.some((term) => terms.has(term) || ancestors.has(term))
          : selected.some((term) => ancestors.has(term))
  return matches ? 'true' : 'false'
}

function relationPredicate(
  operator: string,
  actualValue: ResolvedField['value'],
  condition: FilterCondition,
  now: Date
): FilterTruth {
  if (!isSpecialObject(actualValue) || actualValue.kind !== 'relation') {
    return 'unknown'
  }
  const count = actualValue.records.length
  if (operator === 'related_exists') return count > 0 ? 'true' : 'false'
  if (operator === 'related_missing') return count === 0 ? 'true' : 'false'
  if (operator === 'related_count') {
    if (condition.value?.kind === 'scalar' && typeof condition.value.value === 'number') {
      return count === condition.value.value ? 'true' : 'false'
    }
    return compareRangePredicate('between', count, condition)
  }
  if (operator === 'related_matches' && condition.value?.kind === 'relation') {
    const relationValue = condition.value
    const matched = actualValue.records.filter((record) =>
      evaluateReferenceExpression(relationValue.expression, record, now)
    ).length
    const { count: bounds } = relationValue
    const withinBounds =
      bounds === undefined ||
      ((bounds.gte === undefined || matched >= bounds.gte) &&
        (bounds.lte === undefined || matched <= bounds.lte))
    return matched > 0 && withinBounds ? 'true' : 'false'
  }
  return 'unknown'
}

function matchesText(record: ReferenceFilterRecord, text: string | undefined): boolean {
  if (text === undefined || canonicalFilterString(text).length === 0) return true
  const title = resolveField(record, 'title')
  const actual = scalarValue(title.value)
  return (
    typeof actual === 'string' &&
    canonicalFilterString(actual).includes(canonicalFilterString(text))
  )
}

function compareField(
  left: ReferenceFilterRecord,
  right: ReferenceFilterRecord,
  field: string
): number {
  const leftValue = scalarValue(resolveField(left, field).value)
  const rightValue = scalarValue(resolveField(right, field).value)
  if (leftValue === undefined && rightValue === undefined) return 0
  if (leftValue === undefined) return 1
  if (rightValue === undefined) return -1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
  return String(leftValue).localeCompare(String(rightValue))
}

function facetValues(record: ReferenceFilterRecord, field: string): string[] {
  const resolved = resolveField(record, field)
  if (resolved.state !== 'known' || resolved.value === undefined) return []
  if (Array.isArray(resolved.value)) {
    return resolved.value.map((value) =>
      typeof value === 'string' ? canonicalFilterString(value) : String(value)
    )
  }
  const scalar = scalarValue(resolved.value)
  if (scalar !== undefined)
    return [typeof scalar === 'string' ? canonicalFilterString(scalar) : String(scalar)]
  if (isSpecialObject(resolved.value) && resolved.value.kind === 'hierarchy') {
    return resolved.value.termIds.map(canonicalFilterString)
  }
  return []
}

function selectedFacetValues(expression: FilterExpression | undefined, field: string): Set<string> {
  const selected = new Set<string>()
  const visit = (node: FilterExpression): void => {
    if (node.kind === 'group') {
      node.children.forEach(visit)
      return
    }
    if (node.field !== field) return
    if (node.value?.kind === 'scalar') selected.add(String(node.value.value))
    if (node.value?.kind === 'set') {
      node.value.values.forEach((value) =>
        selected.add(typeof value === 'string' ? canonicalFilterString(value) : String(value))
      )
    }
    if (node.value?.kind === 'hierarchy') {
      node.value.termIds.forEach((value) => selected.add(canonicalFilterString(value)))
    }
  }
  if (expression !== undefined) visit(expression)
  return selected
}

function reduceForSelfExcludingFacet(
  expression: FilterExpression | undefined,
  field: string
): SelfExcludingReduction {
  if (expression === undefined) return { supported: true }
  if (!referencesField(expression, field)) return { supported: true, expression }
  if (expression.kind === 'condition') {
    return expression.field === field ? { supported: true } : { supported: false }
  }
  if (expression.combinator !== 'and' || expression.negated) return { supported: false }
  const remaining: FilterExpression[] = []
  for (const child of expression.children) {
    if (child.kind === 'condition' && child.field === field) continue
    if (referencesField(child, field)) return { supported: false }
    remaining.push(child)
  }
  if (remaining.length === 0) return { supported: true }
  const onlyChild = remaining[0]
  if (remaining.length === 1 && onlyChild !== undefined) {
    return { supported: true, expression: onlyChild }
  }
  return { supported: true, expression: { kind: 'group', combinator: 'and', children: remaining } }
}

function referencesField(expression: FilterExpression, field: string): boolean {
  if (expression.kind === 'group')
    return expression.children.some((child) => referencesField(child, field))
  return (
    expression.field === field ||
    (expression.value?.kind === 'relation' && referencesField(expression.value.expression, field))
  )
}

function countConditions(expression: FilterExpression | undefined): number {
  if (expression === undefined) return 0
  if (expression.kind === 'condition') {
    return (
      1 + (expression.value?.kind === 'relation' ? countConditions(expression.value.expression) : 0)
    )
  }
  return expression.children.reduce((total, child) => total + countConditions(child), 0)
}

function criteriaHash(input: FilterExecutorInput): string {
  return sha256(
    stableJson({
      context: input.definition.key,
      schemaVersion: input.definition.version,
      criteria: { ...input.criteria, page: { size: input.criteria.page.size } },
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
    })
  )
}

function authorizationHash(binding: FilterAuthorizationBinding): string {
  return sha256(
    stableJson({
      context: binding.context,
      schemaVersion: binding.schemaVersion,
      authorizationVersion: binding.authorizationVersion,
      mandatoryFingerprint: binding.mandatoryFingerprint,
      eligibilityFingerprint: binding.eligibilityFingerprint,
      effectiveContextFingerprint: binding.effectiveContextFingerprint,
    })
  )
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 5 &&
    Object.hasOwn(record, 'v') &&
    Object.hasOwn(record, 'criteriaHash') &&
    Object.hasOwn(record, 'authorizationHash') &&
    Object.hasOwn(record, 'position') &&
    Object.hasOwn(record, 'expiresAt') &&
    record['v'] === 1 &&
    typeof record['criteriaHash'] === 'string' &&
    /^[a-f0-9]{64}$/u.test(record['criteriaHash']) &&
    typeof record['authorizationHash'] === 'string' &&
    /^[a-f0-9]{64}$/u.test(record['authorizationHash']) &&
    Number.isSafeInteger(record['position']) &&
    Number(record['position']) >= 0 &&
    Number.isSafeInteger(record['expiresAt']) &&
    Number(record['expiresAt']) >= 0
  )
}
