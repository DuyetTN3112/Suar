import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import type {
  HttpGlobalSearchEntityType,
  HttpGlobalSearchFieldFacet,
  HttpGlobalSearchOptions,
} from '#modules/http/actions/dtos/global_search'
import GetGlobalSearchQuery from '#modules/http/actions/queries/get_global_search_query'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

type SearchPageFilterType = 'all' | HttpGlobalSearchEntityType

@inject()
export default class SearchPageController {
  constructor(private readonly getGlobalSearch: GetGlobalSearchQuery) {}

  async handle(ctx: HttpContext) {
    const rawQuery = ctx.request.input('q') as unknown
    const rawType = ctx.request.input('type') as unknown
    const rawField = ctx.request.input('field') as unknown
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : ''
    const activeType = normalizeSearchPageType(rawType)
    const activeFieldLabel = normalizeSearchFieldLabel(rawField)
    const result = await this.getGlobalSearch.execute(
      query,
      actionContextFromHttp(ctx),
      buildSearchQueryOptions(activeType)
    )
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

function buildSearchQueryOptions(activeType: SearchPageFilterType): HttpGlobalSearchOptions {
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
  fieldFacets: HttpGlobalSearchFieldFacet[]
): string | null {
  if (!requestedField) return null
  return fieldFacets.some((facet) => facet.label === requestedField) ? requestedField : null
}
