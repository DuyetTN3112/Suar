import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type {
  SearchDiscoveryHit,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

export type SearchRelevanceExperimentMode = 'shadow' | 'preview'

export type SearchRelevanceExperimentDecision = 'shadow' | 'preview' | 'fallback'

export type SearchRelevanceExperimentFallbackReason =
  | 'candidate_failed'
  | 'ranking_version_mismatch'
  | 'eligibility_changed'
  | 'facets_changed'
  | 'authorization_changed'

export interface SearchRelevanceExperimentOptions {
  readonly mode: SearchRelevanceExperimentMode
  readonly rankingVersion: string
}

export interface SearchRelevanceExperimentResolution<TDocument> {
  readonly response: SearchDiscoveryResponse<TDocument>
  readonly decision: SearchRelevanceExperimentDecision
  readonly reason?: SearchRelevanceExperimentFallbackReason
}

export interface ResolveSearchRelevanceExperimentInput<TDocument> {
  readonly baseline: SearchDiscoveryResponse<TDocument>
  readonly candidate: () => Promise<SearchDiscoveryResponse<TDocument>>
  readonly options: SearchRelevanceExperimentOptions
}

/**
 * Keeps an advanced ranking candidate behind the authoritative Search response.
 * A candidate may only change ordering and score/explanation metadata; strict
 * eligibility, returned documents, totals, facets, and authority remain owned
 * by the baseline response.
 */
export async function resolveSearchRelevanceExperiment<TDocument>(
  input: ResolveSearchRelevanceExperimentInput<TDocument>
): Promise<SearchRelevanceExperimentResolution<TDocument>> {
  assertExperimentOptions(input.options)
  if (!isBoundedIdentifier(input.baseline.search.rankingVersion)) {
    throw new TypeError('Invalid baseline Search ranking version')
  }

  let candidate: SearchDiscoveryResponse<TDocument>
  try {
    candidate = await input.candidate()
  } catch {
    return fallback(input.baseline, 'candidate_failed')
  }

  let unsafeReason: SearchRelevanceExperimentFallbackReason | undefined
  try {
    unsafeReason = validateCandidate(input.baseline, candidate, input.options.rankingVersion)
  } catch {
    return fallback(input.baseline, 'candidate_failed')
  }
  if (unsafeReason !== undefined) return fallback(input.baseline, unsafeReason)

  if (input.options.mode === 'shadow') {
    return { response: input.baseline, decision: 'shadow' }
  }
  return { response: candidate, decision: 'preview' }
}

function fallback<TDocument>(
  baseline: SearchDiscoveryResponse<TDocument>,
  reason: SearchRelevanceExperimentFallbackReason
): SearchRelevanceExperimentResolution<TDocument> {
  return { response: baseline, decision: 'fallback', reason }
}

function assertExperimentOptions(options: SearchRelevanceExperimentOptions): void {
  if (!isBoundedIdentifier(options.rankingVersion)) {
    throw new TypeError('Invalid experiment Search ranking version')
  }
  const mode: string = options.mode
  if (mode !== 'shadow' && mode !== 'preview') {
    throw new TypeError('Invalid Search relevance experiment mode')
  }
}

function validateCandidate<TDocument>(
  baseline: SearchDiscoveryResponse<TDocument>,
  candidate: SearchDiscoveryResponse<TDocument>,
  expectedRankingVersion: string
): SearchRelevanceExperimentFallbackReason | undefined {
  if (candidate.search.rankingVersion !== expectedRankingVersion) {
    return 'ranking_version_mismatch'
  }
  if (
    candidate.context !== baseline.context ||
    candidate.schemaVersion !== baseline.schemaVersion ||
    stableStringify(criteriaWithoutPreferences(candidate.canonicalCriteria)) !==
      stableStringify(criteriaWithoutPreferences(baseline.canonicalCriteria)) ||
    candidate.search.scope !== baseline.search.scope ||
    candidate.search.inputMode !== baseline.search.inputMode ||
    candidate.search.normalizedQuery !== baseline.search.normalizedQuery ||
    candidate.search.retrievalMode !== baseline.search.retrievalMode ||
    candidate.execution.degraded !== baseline.execution.degraded ||
    candidate.execution.partial !== baseline.execution.partial ||
    stableStringify(candidate.suggestions) !== stableStringify(baseline.suggestions) ||
    stableStringify(candidate.search.diagnostics) !== stableStringify(baseline.search.diagnostics) ||
    stableStringify(candidate.search.sources) !== stableStringify(baseline.search.sources)
  ) {
    return 'eligibility_changed'
  }
  if (
    stableStringify(candidate.total) !== stableStringify(baseline.total) ||
    stableStringify(candidate.facets) !== stableStringify(baseline.facets)
  ) {
    return stableStringify(candidate.facets) === stableStringify(baseline.facets)
      ? 'eligibility_changed'
      : 'facets_changed'
  }
  if (stableStringify(candidate.authority) !== stableStringify(baseline.authority)) {
    return 'authorization_changed'
  }
  if (!sameEligibleHits(baseline.hits, candidate.hits)) return 'eligibility_changed'
  return undefined
}

function sameEligibleHits<TDocument>(
  baseline: readonly SearchDiscoveryHit<TDocument>[],
  candidate: readonly SearchDiscoveryHit<TDocument>[]
): boolean {
  const baselineById = comparableHitsById(baseline)
  const candidateById = comparableHitsById(candidate)
  if (baselineById === undefined || candidateById === undefined) return false
  if (baselineById.size !== candidateById.size) return false
  for (const [id, hit] of baselineById) {
    if (stableStringify(candidateById.get(id)) !== stableStringify(hit)) return false
  }
  return true
}

function comparableHitsById<TDocument>(
  hits: readonly SearchDiscoveryHit<TDocument>[]
): Map<string, unknown> | undefined {
  const result = new Map<string, unknown>()
  for (const hit of hits) {
    if (result.has(hit.id)) return undefined
    result.set(hit.id, {
      id: hit.id,
      entityType: hit.entityType,
      entityId: hit.entityId,
      source: hit.source,
      document: hit.document,
      presentation: hit.presentation,
    })
  }
  return result
}

function criteriaWithoutPreferences(criteria: QueryCriteriaRequest): unknown {
  const { preferences: _preferences, ...strictCriteria } = criteria
  return strictCriteria
}

function isBoundedIdentifier(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`
}
