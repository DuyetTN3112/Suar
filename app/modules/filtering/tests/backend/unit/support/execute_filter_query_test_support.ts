import type {
  FilterPermissionConstraint,
  FilterPermissionConstraintProvider,
} from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type {
  FilterExecutorCapabilities,
  FilterExecutorInput,
  FilterExecutorResult,
  FilterQueryExecutor,
  FilterQueryExecutorResolver,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'

export const principal: FilterPrincipal = {
  kind: 'user',
  id: 'user-1',
  organizationId: 'org-a',
  authorizationVersion: 'grant-7',
}

export function definition(overrides: Partial<FilterContextDefinition> = {}): FilterContextDefinition {
  return {
    key: 'marketplace.tasks',
    version: 3,
    resource: 'task',
    ownerModule: 'marketplace',
    capabilities: {
      text: false,
      facets: true,
      nestedGroups: true,
      preferences: false,
      relativeTime: false,
      savedViews: true,
      sharedViews: false,
      alerts: false,
      emptyRequest: true,
      pagination: 'cursor',
      maxDepth: 3,
      maxConditions: 20,
    },
    fields: [
      {
        key: 'status',
        type: 'scalar',
        operators: ['eq', 'in'],
        effects: ['require', 'exclude'],
        defaultUnknown: 'exclude',
        facetable: true,
        sortable: true,
        projectable: true,
        preference: false,
        valueSearch: false,
        facetCountModes: ['constrained'],
        cost: 1,
      },
      {
        key: 'title',
        type: 'text',
        operators: ['exact'],
        effects: ['require'],
        defaultUnknown: 'exclude',
        facetable: false,
        sortable: false,
        projectable: true,
        preference: false,
        valueSearch: false,
        facetCountModes: [],
        cost: 2,
      },
    ],
    sorts: [{ field: 'status', directions: ['asc', 'desc'] }],
    defaultSort: [{ field: 'status', direction: 'asc' }],
    executionProfile: 'fake-sql',
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 50,
      maxFacetRequests: 2,
      maxProjectionFields: 2,
      maxSorts: 1,
      maxSetValues: 20,
      maxTextLength: 128,
      maxRelationDepth: 1,
      maxCost: 10,
    },
    ...overrides,
  }
}

export function defaultUserFilter(): FilterExpression {
  return {
    kind: 'condition',
    field: 'status',
    operator: 'eq',
    effect: 'require',
    value: { kind: 'scalar', value: 'open' },
    unknown: 'exclude',
  }
}

export function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: 'marketplace.tasks',
    schemaVersion: 3,
    filter: defaultUserFilter(),
    sort: [{ field: 'status', direction: 'asc' }],
    projection: ['status'],
    requestedFacets: [{ field: 'status', countMode: 'constrained' }],
    page: { size: 20 },
    ...overrides,
  }
}

export const mandatory: FilterExpression = {
  kind: 'condition',
  field: 'tenantScope',
  operator: 'eq',
  effect: 'require',
  value: { kind: 'scalar', value: 'tenant-secret-a' },
  unknown: 'exclude',
}

export class FakeExecutor implements FilterQueryExecutor<{ id: string }> {
  readonly profile = 'fake-sql'
  inputs: FilterExecutorInput[] = []
  estimateCalls = 0
  cost = 3
  failure: Error | undefined
  result: Omit<FilterExecutorResult<{ id: string }>, 'authorizationEvidence'> = {
    hits: [{ id: 'visible-1' }],
    total: { value: 1, relation: 'eq' },
    facets: [
      {
        field: 'status',
        countMode: 'constrained',
        values: [{ value: 'open', count: 1, countRelation: 'exact', selected: true }],
      },
    ],
    suggestions: [],
    diagnostics: [],
    page: { nextCursor: 'next-safe' },
    provider: 'fake-sql',
    degraded: false,
    partial: false,
  }

  describeCapabilities(): FilterExecutorCapabilities {
    return {
      text: false,
      facets: true,
      nestedGroups: true,
      preferences: false,
      relativeTime: false,
      relations: false,
      pagination: ['cursor'] as const,
      facetCountModes: ['constrained'] as const,
      totalRelations: ['eq'] as const,
      maxDepth: 5,
      maxConditions: 100,
      maxPageSize: 100,
      maxFacetRequests: 10,
      maxProjectionFields: 10,
      maxSorts: 3,
      maxCost: 500,
      fieldOperators: { status: ['eq', 'in'], title: ['exact'], tenantScope: ['eq'] },
    }
  }

  estimateCost() {
    this.estimateCalls += 1
    return Promise.resolve(this.cost)
  }

  execute(input: FilterExecutorInput): Promise<FilterExecutorResult<{ id: string }>> {
    this.inputs.push(input)
    return this.failure
      ? Promise.reject(this.failure)
      : Promise.resolve({
          ...this.result,
          authorizationEvidence: {
            hits: input.authorizationBinding,
            total: input.authorizationBinding,
            facets: input.authorizationBinding,
            suggestions: input.authorizationBinding,
            page: input.authorizationBinding,
          },
        })
  }
}

export function permissionConstraint(
  expression: FilterExpression | undefined,
  authorizationVersion = 'permission-7'
): FilterPermissionConstraint {
  return {
    ...(expression === undefined ? {} : { expression }),
    fieldBindings: [
      {
        field: 'tenantScope',
        type: 'scalar',
        operators: ['eq'],
        effects: ['require'],
      },
    ],
    authorizationVersion,
  }
}

export function harness(
  overrides: {
    effectiveDefinition?: FilterContextDefinition
    contextFailure?: Error
    permissionFailure?: Error
    mandatoryExpression?: FilterExpression
    executor?: FakeExecutor
    missingExecutor?: boolean
    timeoutMs?: number
  } = {}
) {
  const fakeExecutor = overrides.executor ?? new FakeExecutor()
  const contextProvider: FilterContextProvider = {
    getEffectiveDefinition: () =>
      overrides.contextFailure
        ? Promise.reject(overrides.contextFailure)
        : Promise.resolve(overrides.effectiveDefinition ?? definition()),
  }
  const permissionProvider: FilterPermissionConstraintProvider = {
    buildMandatoryExpression: () =>
      overrides.permissionFailure
        ? Promise.reject(overrides.permissionFailure)
        : Promise.resolve(permissionConstraint(overrides.mandatoryExpression ?? mandatory)),
  }
  const executorResolver: FilterQueryExecutorResolver = {
    getExecutor: () => (overrides.missingExecutor ? undefined : fakeExecutor),
  }
  return {
    fakeExecutor,
    query: new ExecuteFilterQuery({
      contextProvider,
      permissionProvider,
      executorResolver,
      timeoutMs: overrides.timeoutMs ?? 100,
      hashGenerator: new NodeFilterHashGenerator(),
    }),
  }
}

export async function captureExecutionError(
  promise: Promise<QueryCriteriaResponse<unknown>>
): Promise<FilterExecutionError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof FilterExecutionError) return error
    throw error
  }
  throw new Error('Expected filter execution to fail')
}

