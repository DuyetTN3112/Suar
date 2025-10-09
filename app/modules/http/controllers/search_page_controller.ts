import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import {
  type GlobalSearchEntityType,
  type GlobalSearchQueryOptions,
  type GlobalSearchResult,
  searchPublicApi,
} from '#modules/search/public_contracts/search_public_api'

type SearchPageFilterType = 'all' | GlobalSearchEntityType

interface SearchFieldFacet {
  label: string
  entityType: GlobalSearchEntityType
  count: number
}

interface SearchPageControllerDependencies {
  makeSearchQuery?: (ctx: HttpContext) => {
    handle: (query: string, options?: GlobalSearchQueryOptions) => Promise<GlobalSearchResult>
  }
}

export default class SearchPageController {
  constructor(private readonly dependencies: SearchPageControllerDependencies = {}) {}

  async handle(ctx: HttpContext) {
    const rawQuery = ctx.request.input('q') as unknown
    const rawType = ctx.request.input('type') as unknown
    const rawField = ctx.request.input('field') as unknown
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : ''
    const activeType = normalizeSearchPageType(rawType)
    const activeFieldLabel = normalizeSearchFieldLabel(rawField)
    const searchQuery =
      this.dependencies.makeSearchQuery?.(ctx) ?? {
        handle: (nextQuery, options) =>
          searchPublicApi.search(nextQuery, actionContextFromHttp(ctx), options),
      }
    const result = await searchQuery.handle(query, buildSearchQueryOptions(activeType))
    const fieldFacets = result.candidateFieldFacets
    const activeField = normalizeActiveFieldLabel(activeFieldLabel, fieldFacets)

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
    })
  }
}

function buildSearchQueryOptions(activeType: SearchPageFilterType): GlobalSearchQueryOptions {
  return activeType === 'all' ? {} : { entityTypes: [activeType] }
}

function normalizeSearchPageType(value: unknown): SearchPageFilterType {
  const allowed: SearchPageFilterType[] = [
    'all',
    'talent',
    'task',
    'project',
    'skill',
    'organization',
    'comment',
  ]

  return typeof value === 'string' && allowed.includes(value as SearchPageFilterType)
    ? (value as SearchPageFilterType)
    : 'all'
}

function normalizeSearchFieldLabel(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeActiveFieldLabel(
  requestedField: string | null,
  fieldFacets: SearchFieldFacet[]
): string | null {
  if (!requestedField) return null
  return fieldFacets.some((facet) => facet.label === requestedField) ? requestedField : null
}
