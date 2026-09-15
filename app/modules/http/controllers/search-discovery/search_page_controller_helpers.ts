import type { HttpContext } from '@adonisjs/core/http'

import type {
  HttpGlobalSearchEntityType,
  HttpGlobalSearchFieldFacet,
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import {
  SearchDiscoveryError,
  type SearchDiscoveryDiagnosticCode,
} from '#modules/search/public_contracts/search_discovery_contract'

export type SearchPageFilterType = 'all' | HttpGlobalSearchEntityType

export function projectSearchWorkspaceId(ctx: HttpContext): string | null {
  const requestUrl =
    typeof (ctx.request as { url?: unknown }).url === 'function' ? ctx.request.url() : ''
  if (!requestUrl.startsWith('/projects/')) return null

  const projectId: unknown = ctx.params['projectId']
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}

export function currentProjectSearchWorkspaceId(ctx: HttpContext): string | null {
  const requestUrl =
    typeof (ctx.request as { url?: unknown }).url === 'function' ? ctx.request.url() : ''
  if (!requestUrl.startsWith('/search')) return null

  const projectId: unknown = ctx.session.get('current_project_id')
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}

export function shouldUseOrganizationSearchShell(ctx: HttpContext): boolean {
  return (
    (ctx.currentOrganizationRole === 'org_owner' || ctx.currentOrganizationRole === 'org_admin') &&
    ctx.request.url().startsWith('/search')
  )
}

export function buildOrganizationSearchUrl(
  query: string,
  type: SearchPageFilterType,
  field: string | null,
  cursor: string | null,
  previousCursor: string | null
): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (type !== 'all') params.set('type', type)
  if (field) params.set('field', field)
  if (cursor) params.set('cursor', cursor)
  if (previousCursor) params.set('previousCursor', previousCursor)
  const search = params.toString()
  return search.length > 0 ? `/org/search?${search}` : '/org/search'
}

export function buildProjectSearchUrl(
  projectId: string,
  query: string,
  type: SearchPageFilterType,
  field: string | null,
  cursor: string | null,
  previousCursor: string | null
): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (type !== 'all') params.set('type', type)
  if (field) params.set('field', field)
  if (cursor) params.set('cursor', cursor)
  if (previousCursor) params.set('previousCursor', previousCursor)
  const search = params.toString()
  const baseUrl = `/projects/${encodeURIComponent(projectId)}/search`
  return search.length > 0 ? `${baseUrl}?${search}` : baseUrl
}

export function isCursorFailure(error: unknown): error is SearchDiscoveryError {
  return (
    error instanceof SearchDiscoveryError &&
    ['SEARCH_CURSOR_INVALID', 'SEARCH_CURSOR_EXPIRED', 'SEARCH_CURSOR_STALE'].includes(error.code)
  )
}

export function searchDiscoveryErrorCode(error: unknown): SearchDiscoveryDiagnosticCode {
  return (error as { readonly code: SearchDiscoveryDiagnosticCode }).code
}

export function isRetryableDiscoveryError(error: unknown): error is SearchDiscoveryError {
  return (
    error instanceof SearchDiscoveryError &&
    [
      'SEARCH_SOURCE_UNAVAILABLE',
      'SEARCH_SOURCE_TIMED_OUT',
      'SEARCH_INDEX_DISABLED',
      'SEARCH_INDEX_STALE',
    ].includes(error.code)
  )
}

export function emptyGlobalSearchResult(query: string): HttpGlobalSearchResult {
  return {
    query,
    talents: [],
    tasks: [],
    projects: [],
    skills: [],
    organizations: [],
    comments: [],
    results: [],
    candidateResultCount: 0,
    candidateTotalByType: {
      all: 0,
      talent: 0,
      task: 0,
      project: 0,
      skill: 0,
      organization: 0,
      comment: 0,
    },
    candidateFieldFacets: [],
    resultLimit: 24,
    resultsTruncated: false,
    sourceStatuses: [],
  }
}

export function buildSearchQueryOptions(activeType: SearchPageFilterType): HttpGlobalSearchOptions {
  return activeType === 'all' ? {} : { entityTypes: [activeType] }
}

export function supportsSearchDiscovery(activeType: SearchPageFilterType): boolean {
  return activeType === 'all' || activeType === 'task' || activeType === 'talent'
}

export function normalizeActiveFieldLabel(
  requestedField: string | null,
  fieldFacets: HttpGlobalSearchFieldFacet[]
): string | null {
  if (!requestedField) return null
  return fieldFacets.some((facet) => facet.label === requestedField) ? requestedField : null
}
