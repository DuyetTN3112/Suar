import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type {
  HttpGlobalSearchEntityType,
  HttpGlobalSearchFieldFacet,
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import { projectSearchDiscoveryPage } from '#modules/http/actions/dtos/search-discovery/search_page_discovery'
import GetGlobalSearchQuery from '#modules/http/actions/queries/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildSearchPageRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_page_request_mapper'
import {
  SEARCH_BLENDED_CONTEXT,
  SearchDiscoveryError,
  type SearchDiscoveryDiagnosticCode,
} from '#modules/search/public_contracts/search_discovery_contract'
import { TASK_DISCOVERY_CONTEXTS } from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'

type SearchPageFilterType = 'all' | HttpGlobalSearchEntityType
type SearchPageCompatibilityResult = HttpGlobalSearchResult & {
  discovery?: ReturnType<typeof projectSearchDiscoveryPage>
  discoveryFailure?: { code: SearchDiscoveryDiagnosticCode }
}

@inject()
export default class SearchPageController {
  constructor(
    private readonly getGlobalSearch: GetGlobalSearchQuery,
    private readonly getSearchDiscovery?: GetSearchDiscoveryQuery
  ) {}

  async handle(ctx: HttpContext) {
    const pageRequest = buildSearchPageRequest({
      q: ctx.request.input('q'),
      type: ctx.request.input('type'),
      field: ctx.request.input('field'),
      cursor: ctx.request.input('cursor'),
      previousCursor: ctx.request.input('previousCursor'),
    })
    const { query, activeType, requestedField: activeFieldLabel, cursor, previousCursor } = pageRequest
    const currentProjectId = currentProjectSearchWorkspaceId(ctx)
    if (currentProjectId !== null) {
      return ctx.response.redirect(
        buildProjectSearchUrl(currentProjectId, query, activeType, activeFieldLabel, cursor, previousCursor)
      )
    }
    if (shouldUseOrganizationSearchShell(ctx)) {
      return ctx.response.redirect(
        buildOrganizationSearchUrl(query, activeType, activeFieldLabel, cursor, previousCursor)
      )
    }
    const result = await this.resolveCompatibilityResult(ctx, pageRequest)
    const fieldFacets = result.candidateFieldFacets
    const activeField = normalizeActiveFieldLabel(activeFieldLabel, fieldFacets)
    const hasOrganizationScope = Boolean(ctx.currentOrganizationId)
    const taskSearch = activeType === 'task'

    const projectId = projectSearchWorkspaceId(ctx)
    return ctx.inertia.render('search/index', {
      query: result.query,
      submittedQuery: query,
      activeType,
      activeFieldLabel: activeField,
      results: result.results,
      totalByType: result.candidateTotalByType,
      fieldFacets,
      candidateResultCount: result.candidateResultCount,
      resultLimit: result.resultLimit,
      resultsTruncated: result.resultsTruncated,
      sourceStatuses: result.sourceStatuses,
      shareTargets: ctx.currentOrganizationId
        ? [
            {
              type: 'organization',
              id: ctx.currentOrganizationId,
              label: 'Current organization',
            },
          ]
        : [],
      savedViewContextKey: taskSearch
        ? hasOrganizationScope
          ? TASK_DISCOVERY_CONTEXTS.member
          : TASK_DISCOVERY_CONTEXTS.public
        : SEARCH_BLENDED_CONTEXT,
      savedViewContextOwner: taskSearch ? 'tasks' : 'search',
      savedViewCapabilities: {
        sharedViews: taskSearch ? hasOrganizationScope : true,
        alerts: taskSearch && hasOrganizationScope,
      },
      ...(result.discovery === undefined ? {} : { discovery: result.discovery }),
      ...(result.discoveryFailure === undefined
        ? {}
        : { discoveryFailure: result.discoveryFailure }),
      ...(cursor === null ? {} : { cursor }),
      ...(previousCursor === null ? {} : { previousCursor }),
      ...(projectId === null
        ? {}
        : { shellMode: 'project' as const, workspaceMode: 'project' as const, projectId }),
    })
  }

  private async resolveCompatibilityResult(
    ctx: HttpContext,
    pageRequest: ReturnType<typeof buildSearchPageRequest>
  ): Promise<SearchPageCompatibilityResult> {
    const { query, activeType, cursor } = pageRequest
    if (!this.getSearchDiscovery || !this.getSearchDiscovery.isEnabled()) {
      return {
        ...(await this.getGlobalSearch
          .executeAndWrap(query, actionContextFromHttp(ctx), buildSearchQueryOptions(activeType))
          .then((outcome) => outcome.getValue())),
      }
    }

    // Discovery currently owns only the blended, task, and talent search surfaces.
    // Keep the other valid page filters on the legacy source until their verticals
    // are composed; otherwise SearchDiscoveryQuery rejects their scope with 500.
    if (!supportsSearchDiscovery(activeType)) {
      return {
        ...(await this.getGlobalSearch
          .executeAndWrap(query, actionContextFromHttp(ctx), buildSearchQueryOptions(activeType))
          .then((outcome) => outcome.getValue())),
      }
    }

    const criteria: QueryCriteriaRequest = {
      context:
        activeType === 'task'
          ? ctx.currentOrganizationId
            ? 'tasks.discovery.member'
            : 'tasks.discovery.public'
          : activeType === 'talent'
            ? ctx.currentOrganizationId
              ? 'talents.discovery.organization'
              : 'talents.discovery.public'
          : SEARCH_BLENDED_CONTEXT,
      schemaVersion: 1,
      ...(query.length === 0 ? {} : { text: { value: query } }),
      sort: [],
      page: { size: 24, ...(cursor === null ? {} : { cursor }) },
    }

    try {
      const response = await this.getSearchDiscovery
        .executeAndWrap(
          {
            criteria,
            search: { scope: activeType, retrievalMode: 'lexical' },
          },
          actionContextFromHttp(ctx),
          {}
        )
        .then((outcome) => outcome.getValue())
      const discovery = projectSearchDiscoveryPage(response)
      if (discovery === null) {
        throw new SearchDiscoveryError('SEARCH_FALLBACK_UNSAFE')
      }

      return {
        ...(response.compatibility?.globalSearch ?? emptyGlobalSearchResult(query)),
        discovery,
      }
    } catch (error) {
      if (isCursorFailure(error) || (cursor !== null && isRetryableDiscoveryError(error))) {
        return {
          ...emptyGlobalSearchResult(query),
          discoveryFailure: { code: searchDiscoveryErrorCode(error) },
        }
      }

      if (!isRetryableDiscoveryError(error)) throw error
      return {
        ...(await this.getGlobalSearch
          .executeAndWrap(query, actionContextFromHttp(ctx), buildSearchQueryOptions(activeType))
          .then((outcome) => outcome.getValue())),
        discoveryFailure: { code: searchDiscoveryErrorCode(error) },
      }
    }
  }
}

function projectSearchWorkspaceId(ctx: HttpContext): string | null {
  const requestUrl =
    typeof (ctx.request as { url?: unknown }).url === 'function' ? ctx.request.url() : ''
  if (!requestUrl.startsWith('/projects/')) return null

  const projectId: unknown = ctx.params['projectId']
  return (
    typeof projectId === 'string' &&
    projectId.length > 0
  )
    ? projectId
    : null
}

function currentProjectSearchWorkspaceId(ctx: HttpContext): string | null {
  const requestUrl =
    typeof (ctx.request as { url?: unknown }).url === 'function' ? ctx.request.url() : ''
  if (!requestUrl.startsWith('/search')) return null

  const projectId: unknown = ctx.session.get('current_project_id')
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null
}

function shouldUseOrganizationSearchShell(ctx: HttpContext): boolean {
  return (
    (ctx.currentOrganizationRole === 'org_owner' || ctx.currentOrganizationRole === 'org_admin') &&
    ctx.request.url().startsWith('/search')
  )
}

function buildOrganizationSearchUrl(
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

function buildProjectSearchUrl(
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

function isCursorFailure(error: unknown): error is SearchDiscoveryError {
  return (
    error instanceof SearchDiscoveryError &&
    ['SEARCH_CURSOR_INVALID', 'SEARCH_CURSOR_EXPIRED', 'SEARCH_CURSOR_STALE'].includes(error.code)
  )
}

function searchDiscoveryErrorCode(error: unknown): SearchDiscoveryDiagnosticCode {
  return (error as { readonly code: SearchDiscoveryDiagnosticCode }).code
}

function isRetryableDiscoveryError(error: unknown): error is SearchDiscoveryError {
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

function emptyGlobalSearchResult(query: string): HttpGlobalSearchResult {
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

function buildSearchQueryOptions(activeType: SearchPageFilterType): HttpGlobalSearchOptions {
  return activeType === 'all' ? {} : { entityTypes: [activeType] }
}

function supportsSearchDiscovery(activeType: SearchPageFilterType): boolean {
  return activeType === 'all' || activeType === 'task' || activeType === 'talent'
}

function normalizeActiveFieldLabel(
  requestedField: string | null,
  fieldFacets: HttpGlobalSearchFieldFacet[]
): string | null {
  if (!requestedField) return null
  return fieldFacets.some((facet) => facet.label === requestedField) ? requestedField : null
}
