export type EntityType = 'task' | 'project' | 'comment' | 'talent' | 'skill' | 'organization'
export type FilterType = 'all' | EntityType
export type MatchStrength = 'exact' | 'strong' | 'partial' | 'fallback'
export type SourceName = 'talents' | 'tasks' | 'projects' | 'skills' | 'organizations' | 'comments'

export interface HighlightSegment {
  text: string
  match: boolean
}

export interface SearchCenterResult {
  id: string
  entityType: EntityType
  entityId: string
  title: string
  sourceLabel: string
  url: string
  matchedFields: string[]
  matchedFieldLabels?: string[]
  snippets: string[]
  highlightedSnippets?: HighlightSegment[][]
  parentLabel?: string | null
  breadcrumbs?: string[]
  matchStrength?: MatchStrength
  rank?: number
  score?: number | null
  primaryActionLabel?: string
  secondaryMeta?: string | null
}

export interface SourceStatus {
  source: SourceName
  status: 'ok' | 'failed' | 'timed_out' | 'skipped'
  resultCount: number
  errorMessage: string | null
  durationMs?: number
}

export type TotalByType = Record<FilterType, number>

export interface FieldFacet {
  label: string
  entityType: EntityType
  count: number
}

export interface SearchDiscoveryAuthority {
  state: 'authoritative' | 'partial' | 'unsupported' | 'unavailable'
  sources: string[]
  unsupportedSources?: string[]
}

export interface SearchDiscoverySource {
  source: string
  state: 'ok' | 'partial' | 'failed' | 'timed_out' | 'disabled' | 'stale' | 'skipped'
  authority: SearchDiscoveryAuthority['state']
  resultCount: number
  diagnosticCodes: string[]
}

export interface SearchDiscoveryPage {
  hits: import('./discovery_presentation').DiscoveryPresentationHit[]
  total: { value: number; relation: 'eq' | 'gte' | 'unknown' }
  page: { nextCursor?: string; previousCursor?: string }
  authority: {
    hits: SearchDiscoveryAuthority
    total: SearchDiscoveryAuthority
    facets: Array<{ field: string } & SearchDiscoveryAuthority>
  }
  sources: SearchDiscoverySource[]
  diagnostics: Array<{ code: string; severity: 'info' | 'warning' | 'error' }>
  requestId: string
}
