import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  criteriaHash,
  authorizationHash,
  stableJson,
  isCursorPayload,
  type CursorPayload,
} from './reference_filter_cursor_utils.js'
import {
  countConditions,
  evaluateReferenceExpression,
  matchesText,
  compareField,
  reduceForSelfExcludingFacet,
  facetValues,
  selectedFacetValues,
  referencePredicate,
} from './reference_filter_predicates.js'
import type { ReferenceFilterRecord } from './reference_filter_types.js'

import type {
  FilterAuthorizationBinding,
  FilterExecutorCapabilities,
  FilterExecutorInput,
  FilterExecutorResult,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import { canonicalFilterString } from '#modules/filtering/domain/filtering-core/filter_operators'
import { scoreFilterPreferences } from '#modules/filtering/domain/filtering-core/filter_truth'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { FilterFacetGroup } from '#modules/filtering/public_contracts/filter_facets'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'


export type {
  ReferenceSpecialValue,
  ReferenceFieldValue,
  ReferenceFilterRecord,
} from './reference_filter_types.js'

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
