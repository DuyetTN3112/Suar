import { buildSearchCandidates } from './entity_result_mapper.js'
import { entityPriority } from './scoring.js'
import { MAX_SEARCH_CENTER_RESULTS } from './source_runner.js'
import type {
  GlobalSearchCenterResult,
  GlobalSearchFieldFacet,
  GlobalSearchResult,
  SearchResultTotalsByType,
} from './types.js'

export { normalizeSearchText } from './text_matching.js'

export function buildSearchCenterResults(
  grouped: Omit<GlobalSearchResult, 'results'>,
  query: string
): {
  results: GlobalSearchCenterResult[]
  candidateResultCount: number
  candidateTotalByType: SearchResultTotalsByType
  candidateFieldFacets: GlobalSearchFieldFacet[]
  resultLimit: number
  resultsTruncated: boolean
} {
  const candidates = buildSearchCandidates(grouped, query)

  return {
    results: rankResults(candidates),
    candidateResultCount: candidates.length,
    candidateTotalByType: buildSearchResultTotalsByType(candidates),
    candidateFieldFacets: buildSearchFieldFacets(candidates),
    resultLimit: MAX_SEARCH_CENTER_RESULTS,
    resultsTruncated: candidates.length > MAX_SEARCH_CENTER_RESULTS,
  }
}

export function emptySearchResultTotalsByType(): SearchResultTotalsByType {
  return {
    all: 0,
    talent: 0,
    task: 0,
    project: 0,
    skill: 0,
    organization: 0,
    comment: 0,
  }
}

function buildSearchResultTotalsByType(
  results: GlobalSearchCenterResult[]
): SearchResultTotalsByType {
  const totals = emptySearchResultTotalsByType()
  totals.all = results.length

  for (const result of results) {
    totals[result.entityType] += 1
  }

  return totals
}

function buildSearchFieldFacets(results: GlobalSearchCenterResult[]): GlobalSearchFieldFacet[] {
  const facets = new Map<string, GlobalSearchFieldFacet>()

  for (const result of results) {
    const labels =
      result.matchedFieldLabels.length > 0 ? result.matchedFieldLabels : [result.sourceLabel]
    for (const label of labels) {
      const key = `${result.entityType}:${label}`
      const existing = facets.get(key)
      if (existing) {
        existing.count += 1
      } else {
        facets.set(key, {
          label,
          entityType: result.entityType,
          count: 1,
        })
      }
    }
  }

  return [...facets.values()].sort((left, right) => {
    const countDelta = right.count - left.count
    if (countDelta !== 0) return countDelta
    return left.label.localeCompare(right.label)
  })
}

function rankResults(results: GlobalSearchCenterResult[]): GlobalSearchCenterResult[] {
  return results
    .slice()
    .sort((left, right) => {
      const scoreDelta = (right.score ?? 0) - (left.score ?? 0)
      if (scoreDelta !== 0) return scoreDelta
      const typeDelta = entityPriority(right.entityType) - entityPriority(left.entityType)
      if (typeDelta !== 0) return typeDelta
      return left.title.localeCompare(right.title)
    })
    .slice(0, MAX_SEARCH_CENTER_RESULTS)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }))
}
