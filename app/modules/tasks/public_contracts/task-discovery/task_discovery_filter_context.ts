import {
  FilterContextResolutionError,
  type FilterContextProvider,
  type FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  TASK_DISCOVERY_ALL_SEMANTIC_FIELDS,
  TASK_DISCOVERY_PERMISSION_FIELDS,
  taskDiscoverySemanticFields,
  taskDiscoverySorts,
  type TaskDiscoveryAudience,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_semantic_fields'

type FilterContextDefinition = Awaited<ReturnType<FilterContextProvider['getEffectiveDefinition']>>

export const TASK_DISCOVERY_CONTEXTS = {
  public: 'tasks.discovery.public',
  member: 'tasks.discovery.member',
} as const

export const TASK_DISCOVERY_EXECUTION_PROFILE = 'search.tasks.discovery.v1'

const FIELD_OPERATORS = Object.fromEntries([
  ...TASK_DISCOVERY_ALL_SEMANTIC_FIELDS.map(({ key, operators }) => [key, [...operators]] as const),
  [TASK_DISCOVERY_PERMISSION_FIELDS.notDeleted, ['is_false']],
  [TASK_DISCOVERY_PERMISSION_FIELDS.marketplaceVisible, ['is_true']],
  [TASK_DISCOVERY_PERMISSION_FIELDS.applicationEligible, ['is_true']],
  [TASK_DISCOVERY_PERMISSION_FIELDS.applicationDeadline, ['overdue']],
  [TASK_DISCOVERY_PERMISSION_FIELDS.organizationId, ['eq']],
  [TASK_DISCOVERY_PERMISSION_FIELDS.memberVisible, ['is_true']],
])

export const TASK_DISCOVERY_SEARCH_CAPABILITIES = {
  text: true,
  facets: true,
  nestedGroups: true,
  preferences: true,
  relativeTime: true,
  relations: false,
  pagination: ['cursor'],
  facetCountModes: ['constrained', 'self_excluding'],
  totalRelations: ['eq', 'gte', 'unknown'],
  maxDepth: 5,
  maxConditions: 48,
  maxPageSize: 50,
  maxFacetRequests: 16,
  maxProjectionFields: 24,
  maxSorts: 2,
  maxCost: 300,
  fieldOperators: FIELD_OPERATORS,
} as const

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

function resolveAudience(
  context: string,
  principal: FilterPrincipal
): TaskDiscoveryAudience | null {
  if (context === TASK_DISCOVERY_CONTEXTS.public) {
    if (principal.kind === 'anonymous' && principal.id === undefined) return 'anonymous'
    if (principal.kind === 'user' && isBoundedIdentifier(principal.id)) return 'public'
    return null
  }
  if (
    context === TASK_DISCOVERY_CONTEXTS.member &&
    (principal.kind === 'user' || principal.kind === 'service') &&
    isBoundedIdentifier(principal.id) &&
    isBoundedIdentifier(principal.organizationId) &&
    (principal.kind === 'service' ||
      principal.organizationRole === OrganizationRole.OWNER ||
      principal.organizationRole === OrganizationRole.ADMIN ||
      principal.organizationRole === OrganizationRole.MEMBER)
  ) {
    return 'member'
  }
  return null
}

function definition(
  context: (typeof TASK_DISCOVERY_CONTEXTS)[keyof typeof TASK_DISCOVERY_CONTEXTS],
  audience: TaskDiscoveryAudience
): FilterContextDefinition {
  const authenticated = audience !== 'anonymous'
  return {
    key: context,
    version: 1,
    resource: 'task',
    ownerModule: 'tasks',
    capabilities: {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: authenticated,
      relativeTime: true,
      savedViews: authenticated,
      sharedViews: audience === 'member',
      alerts: audience === 'member',
      emptyRequest: true,
      pagination: 'cursor',
      maxDepth: 5,
      maxConditions: 48,
    },
    fields: taskDiscoverySemanticFields(audience),
    sorts: taskDiscoverySorts(),
    defaultSort: [{ field: 'task.updatedAt', direction: 'desc' }],
    executionProfile: TASK_DISCOVERY_EXECUTION_PROFILE,
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 50,
      maxFacetRequests: 16,
      maxProjectionFields: 24,
      maxSorts: 2,
      maxSetValues: 100,
      maxTextLength: 512,
      maxCursorLength: 8_192,
      maxRelationDepth: 0,
      maxCost: 300,
    },
    presentationHints: {
      filterOnly: true,
      textSort: 'relevance',
      missingMetadata: 'explicit_when_useful',
      selectedRetiredTerms: 'retain',
      highCardinalityFacets: 'search',
    },
  }
}

export class TaskDiscoveryFilterContextProvider implements FilterContextProvider {
  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition> {
    const audience = resolveAudience(input.context, input.principal)
    if (audience === null) return Promise.reject(new FilterContextResolutionError())

    const context =
      input.context === TASK_DISCOVERY_CONTEXTS.public
        ? TASK_DISCOVERY_CONTEXTS.public
        : TASK_DISCOVERY_CONTEXTS.member
    return Promise.resolve(definition(context, audience))
  }
}
