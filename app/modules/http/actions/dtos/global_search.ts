export type HttpGlobalSearchEntityType =
  | 'talent'
  | 'task'
  | 'project'
  | 'skill'
  | 'organization'
  | 'comment'

export type HttpGlobalSearchSourceName =
  | 'talents'
  | 'tasks'
  | 'projects'
  | 'skills'
  | 'organizations'
  | 'comments'

export interface HttpGlobalSearchOptions {
  entityTypes?: HttpGlobalSearchEntityType[]
}

export interface HttpGlobalSearchSourceStatus {
  source: HttpGlobalSearchSourceName
  status: 'ok' | 'failed' | 'timed_out' | 'skipped'
  resultCount: number
  errorMessage: string | null
  durationMs: number
}

export interface HttpGlobalSearchFieldFacet {
  label: string
  entityType: HttpGlobalSearchEntityType
  count: number
}

export interface HttpGlobalSearchCenterResult {
  id: string
  entityType: HttpGlobalSearchEntityType
  entityId: string
  title: string
  sourceLabel: string
  url: string
  matchedFields: string[]
  matchedFieldLabels: string[]
  snippets: string[]
  highlightedSnippets: Array<Array<{ text: string; match: boolean }>>
  parentLabel?: string | null
  breadcrumbs: string[]
  matchStrength: 'exact' | 'strong' | 'partial' | 'fallback'
  rank: number
  score?: number | null
  primaryActionLabel: string
  secondaryMeta: string | null
}

export type HttpGlobalSearchTotals = Record<HttpGlobalSearchEntityType | 'all', number>

/**
 * HTTP-owned read projection. Source-specific collections remain opaque:
 * the transport module serializes them but does not own their business schemas.
 */
export interface HttpGlobalSearchResult {
  query: string
  talents: unknown[]
  tasks: unknown[]
  projects: unknown[]
  skills: unknown[]
  organizations: unknown[]
  comments: unknown[]
  results: HttpGlobalSearchCenterResult[]
  candidateResultCount: number
  candidateTotalByType: HttpGlobalSearchTotals
  candidateFieldFacets: HttpGlobalSearchFieldFacet[]
  resultLimit: number
  resultsTruncated: boolean
  sourceStatuses: HttpGlobalSearchSourceStatus[]
}
