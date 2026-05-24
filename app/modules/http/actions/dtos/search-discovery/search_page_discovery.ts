import type {
  SearchDiscoveryHit,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

export type SearchPageDiscoveryHit = Pick<
  SearchDiscoveryHit,
  'id' | 'entityType' | 'entityId' | 'rank' | 'score'
> & {
  readonly presentation: NonNullable<SearchDiscoveryHit['presentation']>
}

export interface SearchPageDiscoveryModel {
  readonly hits: readonly SearchPageDiscoveryHit[]
  readonly total: SearchDiscoveryResponse['total']
  readonly page: SearchDiscoveryResponse['page']
  readonly authority: SearchDiscoveryResponse['authority']
  readonly sources: SearchDiscoveryResponse['search']['sources']
  readonly diagnostics: SearchDiscoveryResponse['search']['diagnostics']
  readonly requestId: string
}

/**
 * Projects only server-owned Discovery presentation into the Inertia page model.
 * A hit without presentation is rejected instead of deriving labels/navigation from its document.
 */
export function projectSearchDiscoveryPage(
  response: SearchDiscoveryResponse
): SearchPageDiscoveryModel | null {
  const hits: SearchPageDiscoveryHit[] = []

  for (const hit of response.hits) {
    if (!hit.presentation) return null

    hits.push({
      id: hit.id,
      entityType: hit.entityType,
      entityId: hit.entityId,
      rank: hit.rank,
      ...(hit.score === undefined ? {} : { score: hit.score }),
      presentation: hit.presentation,
    })
  }

  return {
    hits,
    total: response.total,
    page: response.page,
    authority: response.authority,
    sources: response.search.sources,
    diagnostics: response.search.diagnostics,
    requestId: response.search.requestId,
  }
}
