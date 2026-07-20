import { TALENT_SEARCH_DISCOVERY_BINDINGS } from './talent_search_discovery_bindings.js'

import {
  FilterContextResolutionError,
  type FilterContextProvider,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterContextDefinition } from '#modules/filtering/public_contracts/filter_contracts'

export const TALENT_DISCOVERY_CONTEXTS = {
  public: 'talents.discovery.public',
  organization: 'talents.discovery.organization',
} as const
export const TALENT_DISCOVERY_EXECUTION_PROFILE = 'search.talents.discovery.v1'

const operators: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(TALENT_SEARCH_DISCOVERY_BINDINGS).map(([key, binding]) => [
    key,
    binding.type === 'multi_value'
      ? [
          'contains_any',
          'contains_all',
          'contains_none',
          'contains_exactly',
          'contains_at_least',
          'is_empty',
        ]
      : binding.type === 'number'
        ? ['eq', 'gte', 'gt', 'lte', 'lt', 'between']
        : binding.type === 'date_time'
          ? ['before', 'after', 'between', 'within_last']
      : binding.type === 'boolean'
        ? ['is_true', 'is_false', 'is_unknown']
        : binding.type === 'relation'
          ? ['related_exists', 'related_missing', 'related_count', 'related_matches']
          : ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'],
  ])
)

const fields = Object.entries(TALENT_SEARCH_DISCOVERY_BINDINGS)
  .filter(([key]) => !key.startsWith('permission.'))
  .map(([key, binding]) => ({
    key,
    type: binding.type,
    operators: operators[key] ?? [],
    effects: ['require', 'exclude'] as const,
    defaultUnknown: 'exclude' as const,
    facetable: binding.facetable ?? false,
    sortable: binding.sortable ?? false,
    projectable: true,
    preference: false,
    valueSearch: binding.type === 'text',
    facetCountModes: ['constrained', 'self_excluding'] as const,
    cost: 1,
    ...(binding.type === 'relation'
      ? {
          relationFields: Object.fromEntries(
            Object.entries(binding.relationBindings ?? {}).map(([nestedKey, nestedBinding]) => [
              nestedKey,
              {
                type: nestedBinding.type,
                operators:
                  nestedBinding.type === 'number'
                    ? ['eq', 'gte', 'gt', 'lte', 'lt', 'between']
                    : ['eq', 'neq', 'in', 'not_in', 'exists', 'missing'],
              },
            ])
          ),
        }
      : {}),
  }))

export class TalentDiscoveryFilterContextProvider implements FilterContextProvider {
  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition> {
    if (!isAllowedPrincipal(input.context, input.principal)) {
      return Promise.reject(new FilterContextResolutionError())
    }
    return Promise.resolve({
      key: input.context,
      version: 1,
      resource: 'talent',
      ownerModule: 'search',
      capabilities: {
        text: true,
        facets: true,
        nestedGroups: true,
        preferences: false,
        relativeTime: true,
        savedViews: false,
        sharedViews: false,
        alerts: false,
        emptyRequest: true,
        pagination: 'cursor',
        maxDepth: 5,
        maxConditions: 48,
      },
      fields,
      sorts: [
        { field: 'talent.trustScore', directions: ['asc', 'desc'] },
        { field: 'talent.completedTasks', directions: ['asc', 'desc'] },
      ],
      defaultSort: [{ field: 'talent.trustScore', direction: 'desc' }],
      executionProfile: TALENT_DISCOVERY_EXECUTION_PROFILE,
      degradationPolicy: 'fail_closed',
      limits: {
        maxPageSize: 50,
        maxFacetRequests: 16,
        maxProjectionFields: 24,
        maxSorts: 2,
        maxSetValues: 100,
        maxTextLength: 512,
        maxCursorLength: 8192,
        maxRelationDepth: 1,
        maxCost: 300,
      },
    })
  }
}

function isAllowedPrincipal(
  context: string,
  principal: FilterPrincipal
): context is (typeof TALENT_DISCOVERY_CONTEXTS)[keyof typeof TALENT_DISCOVERY_CONTEXTS] {
  if (context === TALENT_DISCOVERY_CONTEXTS.public) {
    return principal.kind === 'anonymous'
  }

  return (
    context === TALENT_DISCOVERY_CONTEXTS.organization &&
    principal.kind === 'user' &&
    typeof principal.id === 'string' &&
    principal.id.length > 0 &&
    typeof principal.organizationId === 'string' &&
    principal.organizationId.length > 0 &&
    isOrganizationRole(principal.organizationRole)
  )
}

function isOrganizationRole(
  role: string | undefined
): role is 'org_owner' | 'org_admin' {
  return role === 'org_owner' || role === 'org_admin'
}
