import {
  FilterContextResolutionError,
  type FilterContextProvider,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterContextDefinition } from '#modules/filtering/public_contracts/filter_contracts'
import { SEARCH_BLENDED_CONTEXT } from '#modules/search/public_contracts/search_discovery_contract'

/**
 * The legacy blended API is a text-only retrieval surface. Its saved views are
 * persisted client intent that Search applies through its own discovery API;
 * it is deliberately not registered with Filter Platform's generic executor.
 */
export const SEARCH_BLENDED_FILTER_EXECUTION_PROFILE = 'search.blended.legacy.v1'

function isAuthenticatedUser(principal: FilterPrincipal): principal is FilterPrincipal & { id: string } {
  return principal.kind === 'user' && typeof principal.id === 'string' && principal.id.trim().length > 0
}

export class SearchBlendedFilterContextProvider implements FilterContextProvider {
  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition> {
    if (input.context !== SEARCH_BLENDED_CONTEXT || !isAuthenticatedUser(input.principal)) {
      return Promise.reject(new FilterContextResolutionError())
    }

    return Promise.resolve({
      key: SEARCH_BLENDED_CONTEXT,
      version: 1,
      resource: 'search_result',
      ownerModule: 'search',
      capabilities: {
        text: true,
        facets: false,
        nestedGroups: false,
        preferences: false,
        relativeTime: false,
        savedViews: true,
        sharedViews: true,
        alerts: false,
        emptyRequest: false,
        pagination: 'none',
        maxDepth: 0,
        maxConditions: 0,
      },
      fields: [],
      sorts: [],
      defaultSort: [],
      executionProfile: SEARCH_BLENDED_FILTER_EXECUTION_PROFILE,
      degradationPolicy: 'fail_closed',
      limits: {
        maxPageSize: 25,
        maxFacetRequests: 0,
        maxProjectionFields: 0,
        maxSorts: 0,
        maxSetValues: 0,
        maxTextLength: 512,
        maxRelationDepth: 0,
        maxCost: 1,
      },
      presentationHints: {
        savedViewApplication: 'search_owned_discovery_navigation',
      },
    })
  }
}
