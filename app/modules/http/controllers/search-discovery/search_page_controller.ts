import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  projectSearchWorkspaceId,
  currentProjectSearchWorkspaceId,
  shouldUseOrganizationSearchShell,
  buildOrganizationSearchUrl,
  buildProjectSearchUrl,
  isCursorFailure,
  searchDiscoveryErrorCode,
  isRetryableDiscoveryError,
  emptyGlobalSearchResult,
  buildSearchQueryOptions,
  supportsSearchDiscovery,
  normalizeActiveFieldLabel,
} from './search_page_controller_helpers.js'

import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type { HttpGlobalSearchResult } from '#modules/http/actions/dtos/global_search'
import { projectSearchDiscoveryPage } from '#modules/http/actions/dtos/search-discovery/search_page_discovery'
import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildSearchPageRequest } from '#modules/http/controllers/mappers/request/search-discovery/search_page_request_mapper'
import {
  SEARCH_BLENDED_CONTEXT,
  SearchDiscoveryError,
  type SearchDiscoveryDiagnosticCode,
} from '#modules/search/public_contracts/search_discovery_contract'
import { TASK_DISCOVERY_CONTEXTS } from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'


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

