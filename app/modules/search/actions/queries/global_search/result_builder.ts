import { buildSearchCandidates } from './entity_result_mapper.js'
import { entityPriority } from './scoring.js'
import { MAX_SEARCH_CENTER_RESULTS } from './source_runner.js'

import { weightedReciprocalRankFusion } from '#modules/search/domain/reciprocal_rank_fusion'
import type {
  GlobalSearchCenterResult,
  GlobalSearchFieldFacet,
  GlobalSearchResult,
  SearchResultTotalsByType,
} from '#modules/search/public_contracts/global_search_contract'

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
  const textRankedResults = results.slice().sort((left, right) => {
    const scoreDelta = (right.score ?? 0) - (left.score ?? 0)
    if (scoreDelta !== 0) return scoreDelta
    const typeDelta = entityPriority(right.entityType) - entityPriority(left.entityType)
    if (typeDelta !== 0) return typeDelta
    return left.title.localeCompare(right.title)
  })
  const textRanks = new Map<string, number>()
  let previousTextResult: GlobalSearchCenterResult | undefined
  let currentTextRank = 0
  for (const [index, result] of textRankedResults.entries()) {
    const tiedWithPrevious =
      previousTextResult !== undefined &&
      (previousTextResult.score ?? 0) === (result.score ?? 0) &&
      entityPriority(previousTextResult.entityType) === entityPriority(result.entityType)
    if (!tiedWithPrevious) {
      currentTextRank = index + 1
    }
    textRanks.set(result.id, currentTextRank)
    previousTextResult = result
  }
  const sourceCounts = new Map<GlobalSearchCenterResult['entityType'], number>()
  const sourceRanks = new Map<string, number>()
  for (const result of results) {
    const sourceRank = (sourceCounts.get(result.entityType) ?? 0) + 1
    sourceCounts.set(result.entityType, sourceRank)
    sourceRanks.set(result.id, sourceRank)
  }

  return results
    .map((result) => {
      const textRank = textRanks.get(result.id) ?? textRankedResults.length
      const sourceRank = sourceRanks.get(result.id) ?? results.length
      const rankingScore = weightedReciprocalRankFusion([
        { rank: textRank, weight: 2 },
        { rank: sourceRank, weight: 1 },
      ])

      return {
        ...result,
        rankingAlgorithm: 'weighted_rrf_v1' as const,
        rankingScore,
        rankingSignals: {
          textRank,
          sourceRank,
          textScore: result.score ?? 0,
        },
      }
    })
    .sort((left, right) => {
      const fusionDelta = right.rankingScore - left.rankingScore
      if (fusionDelta !== 0) return fusionDelta
      const textRankDelta = left.rankingSignals.textRank - right.rankingSignals.textRank
      if (textRankDelta !== 0) return textRankDelta
      return left.title.localeCompare(right.title)
    })
    .slice(0, MAX_SEARCH_CENTER_RESULTS)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }))
}
