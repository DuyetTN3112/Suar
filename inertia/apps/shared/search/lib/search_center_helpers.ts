import type {
  FilterType,
  SearchDiscoveryPage,
  SourceName,
  SourceStatus,
  TotalByType,
} from '../types'

import type { TranslateFn } from './translation'

export const RECENT_SEARCHES_KEY = 'suar:search:recent_queries'
export const MAX_RECENT_SEARCHES = 5

export function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, MAX_RECENT_SEARCHES)
      : []
  } catch {
    return []
  }
}

export function rememberRecentSearch(value: string): string[] {
  const normalized = value.trim()
  if (!normalized || typeof window === 'undefined') return readRecentSearches()

  const next = [
    normalized,
    ...readRecentSearches().filter((item) => item.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES)

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  } catch {}

  return next
}

export function removeRecentSearch(currentList: string[], recentQuery: string): string[] {
  const next = currentList.filter((item) => item !== recentQuery)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
    } catch {}
  }
  return next
}

export function sourceForType(type: FilterType): SourceName | null {
  switch (type) {
    case 'task':
      return 'tasks'
    case 'project':
      return 'projects'
    case 'comment':
      return 'comments'
    case 'talent':
      return 'talents'
    case 'skill':
      return 'skills'
    case 'organization':
      return 'organizations'
    case 'all':
      return null
    default:
      return null
  }
}

export function formatFailedSourceSummary(failedSources: SourceStatus[], t: TranslateFn): string {
  return failedSources
    .map((source) =>
      source.status === 'timed_out'
        ? t(
            'workspace.search.source_timed_out',
            { source: source.source },
            ':source source timed out'
          )
        : t(
            'workspace.search.source_unavailable',
            { source: source.source },
            ':source source unavailable'
          )
    )
    .join(', ')
}

export function buildSourceStatusTelemetry(sourceStatuses: SourceStatus[]) {
  return sourceStatuses.map((source) => ({
    source: source.source,
    status: source.status,
    result_count: source.resultCount,
    duration_ms: source.durationMs ?? 0,
  }))
}

export function calculateEffectiveTotalByType(
  totalByType: TotalByType,
  discovery: SearchDiscoveryPage | null,
  types: FilterType[]
): TotalByType {
  if (!discovery) return totalByType

  const totals: TotalByType = { ...totalByType }
  const hitTotals: TotalByType = {
    all: discovery.hits.length,
    task: 0,
    project: 0,
    comment: 0,
    talent: 0,
    skill: 0,
    organization: 0,
  }
  for (const hit of discovery.hits) {
    hitTotals[hit.entityType] += 1
  }

  totals.all = discovery.total.value
  for (const type of types.filter((item): item is Exclude<FilterType, 'all'> => item !== 'all')) {
    if (totals[type] === 0 && hitTotals[type] > 0) {
      totals[type] = hitTotals[type]
    }
  }
  return totals
}
