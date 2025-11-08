import type { OrganizationDirectoryItem } from '#modules/organizations/public_contracts/organization_directory'
import type { GetProjectsListResult } from '#modules/projects/public_contracts/project_listing'
import type { ActiveSkillCatalogItem } from '#modules/skills/public_contracts/active_skill_catalog'
import type { PublicTaskListingResult } from '#modules/tasks/public_contracts/public_task_listing'
import type { TalentSearchResult } from '#modules/users/public_contracts/talent_search'

export type GlobalSearchEntityType =
  | 'talent'
  | 'task'
  | 'project'
  | 'skill'
  | 'organization'
  | 'comment'

export type GlobalSearchSourceName =
  | 'talents'
  | 'tasks'
  | 'projects'
  | 'skills'
  | 'organizations'
  | 'comments'

export interface GlobalSearchSourceStatus {
  source: GlobalSearchSourceName
  status: 'ok' | 'failed' | 'timed_out' | 'skipped'
  resultCount: number
  errorMessage: string | null
  durationMs: number
}

export interface GlobalSearchTaskCommentResult {
  id: string
  taskId: string
  taskTitle: string
  body: string
  authorName: string | null
  createdAt: string
}

export type SearchMatchStrength = 'exact' | 'strong' | 'partial' | 'fallback'

export type HighlightedSnippet = Array<{
  text: string
  match: boolean
}>

export interface GlobalSearchCenterResult {
  id: string
  entityType: GlobalSearchEntityType
  entityId: string
  title: string
  sourceLabel: string
  url: string
  matchedFields: string[]
  matchedFieldLabels: string[]
  snippets: string[]
  highlightedSnippets: HighlightedSnippet[]
  parentLabel?: string | null
  breadcrumbs: string[]
  matchStrength: SearchMatchStrength
  rank: number
  score?: number | null
  primaryActionLabel: string
  secondaryMeta: string | null
}

export interface GlobalSearchFieldFacet {
  label: string
  entityType: GlobalSearchEntityType
  count: number
}

export type SearchResultTotalsByType = Record<GlobalSearchEntityType | 'all', number>

export interface GlobalSearchResult {
  query: string
  talents: TalentSearchResult[]
  tasks: PublicTaskListingResult['data']
  projects: GetProjectsListResult['data']
  skills: ActiveSkillCatalogItem[]
  organizations: OrganizationDirectoryItem[]
  comments: GlobalSearchTaskCommentResult[]
  results: GlobalSearchCenterResult[]
  candidateResultCount: number
  candidateTotalByType: SearchResultTotalsByType
  candidateFieldFacets: GlobalSearchFieldFacet[]
  resultLimit: number
  resultsTruncated: boolean
  sourceStatuses: GlobalSearchSourceStatus[]
}

export interface GlobalSearchQueryOptions {
  entityTypes?: GlobalSearchEntityType[]
}

export interface SearchableField {
  key: string
  label: string
  value: string | null
}
