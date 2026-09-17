import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import type {
  ElasticsearchFilterQueryExecutor,
  ElasticsearchFilterExecutorInput,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'

export const bindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id', sortable: true },
  tenant: { type: 'scalar', path: 'tenant' },
  status: { type: 'scalar', path: 'status', facetable: true },
  title: { type: 'text', path: 'title' },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
    facetable: true,
    exposeMissingCount: true,
    exposeCoverage: true,
  },
  score: { type: 'number', path: 'score', sortable: true },
  createdAt: { type: 'date_time', path: 'created_at', sortable: true },
}

export const integrationMappings = {
  dynamic: 'strict' as const,
  properties: {
    id: { type: 'keyword' as const },
    tenant: { type: 'keyword' as const },
    status: { type: 'keyword' as const },
    title: { type: 'text' as const },
    skills: { type: 'keyword' as const },
    skills_known: { type: 'boolean' as const },
    skills_count: { type: 'integer' as const },
    score: { type: 'integer' as const },
    created_at: { type: 'date' as const },
  },
}

export const definition = {
  key: 'filter.elasticsearch.integration',
  version: 1,
  resource: 'search-document',
  ownerModule: 'Search',
  capabilities: {
    text: true,
    facets: true,
    nestedGroups: true,
    preferences: true,
    relativeTime: true,
    savedViews: false,
    sharedViews: false,
    alerts: false,
    emptyRequest: true,
    pagination: 'cursor' as const,
    maxDepth: 8,
    maxConditions: 200,
  },
  fields: Object.entries(bindings).map(([key, binding]) => ({
    key,
    type: binding.type,
    operators: [],
    effects: ['require', 'exclude'] as const,
    defaultUnknown: 'exclude' as const,
    facetable: binding.facetable ?? false,
    sortable: ['id', 'score', 'createdAt'].includes(key),
    projectable: true,
    preference: true,
    valueSearch: binding.facetable ?? false,
    facetCountModes: ['constrained', 'self_excluding'] as const,
    cost: 1,
  })),
  sorts: ['id', 'score', 'createdAt'].map((field) => ({
    field,
    directions: ['asc', 'desc'] as const,
  })),
  defaultSort: [{ field: 'id', direction: 'asc' as const }],
  executionProfile: 'elasticsearch.integration.v1',
  degradationPolicy: 'fail_closed' as const,
  limits: {
    maxPageSize: 100,
    maxFacetRequests: 8,
    maxProjectionFields: 20,
    maxSorts: 4,
    maxSetValues: 100,
    maxTextLength: 200,
    maxRelationDepth: 2,
    maxCost: 1_000,
  },
}

export interface Document {
  id: string
  tenant: string
  status: string
  title: string
  skills?: string[]
  skills_known?: boolean
  skills_count?: number
  score?: number
  created_at?: string
}

export function condition(
  field: string,
  operator: string,
  value?: Extract<FilterExpression, { kind: 'condition' }>['value']
): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

export function request(
  executor: ElasticsearchFilterQueryExecutor<Record<string, unknown>>,
  overrides: Partial<QueryCriteriaRequest> = {}
): ElasticsearchFilterExecutorInput<object> {
  const mandatoryFilter = condition('tenant', 'eq', { kind: 'scalar', value: 'org-a' })
  const criteria: QueryCriteriaRequest = {
    context: definition.key,
    schemaVersion: definition.version,
    sort: [{ field: 'id', direction: 'asc' }],
    page: { size: 100 },
    ...overrides,
  }
  return {
    definition,
    criteria,
    mandatoryFilter,
    eligibilityFilter:
      criteria.filter === undefined
        ? mandatoryFilter
        : {
            kind: 'group',
            combinator: 'and',
            children: [mandatoryFilter, criteria.filter],
          },
    authorizationBinding: { authorizationVersion: 'auth-v1', tenant: 'org-a' },
    requestId: `wp13-${executor.profile}`,
  }
}
