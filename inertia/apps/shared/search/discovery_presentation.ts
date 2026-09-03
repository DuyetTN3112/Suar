export interface DiscoveryPresentationHit {
  readonly id: string
  readonly entityType: 'task' | 'project' | 'comment' | 'talent' | 'skill' | 'organization'
  readonly entityId: string
  readonly rank: number
  readonly score?: number | null
  readonly presentation?: {
    readonly title: string
    readonly url: string
    readonly sourceLabel: string
    readonly snippets: readonly string[]
    readonly breadcrumbs: readonly string[]
    readonly primaryActionLabel: string
  }
}

export interface SearchCardProjection {
  readonly id: string
  readonly entityType: DiscoveryPresentationHit['entityType']
  readonly entityId: string
  readonly title: string
  readonly sourceLabel: string
  readonly url: string
  readonly snippets: readonly string[]
  readonly breadcrumbs: readonly string[]
  readonly rank: number
  readonly score?: number | null
  readonly primaryActionLabel: string
}

/** Drops incomplete hits rather than fabricating client-side navigation or labels. */
export function projectDiscoveryHitsToSearchCards(
  hits: readonly DiscoveryPresentationHit[]
): readonly SearchCardProjection[] {
  return hits.flatMap((hit) => {
    const presentation = hit.presentation
    if (presentation === undefined) return []
    return [{
      id: hit.id,
      entityType: hit.entityType,
      entityId: hit.entityId,
      title: presentation.title,
      sourceLabel: presentation.sourceLabel,
      url: presentation.url,
      snippets: presentation.snippets,
      breadcrumbs: presentation.breadcrumbs,
      rank: hit.rank,
      ...(hit.score === undefined ? {} : { score: hit.score }),
      primaryActionLabel: presentation.primaryActionLabel,
    }]
  })
}
