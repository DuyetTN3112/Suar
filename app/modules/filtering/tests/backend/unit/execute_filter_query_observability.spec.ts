import { test } from '@japa/runner'

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
import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'

const principal: FilterPrincipal = { kind: 'user', id: 'observer-user' }

const userFilter: FilterExpression = {
  kind: 'condition',
  field: 'status',
  operator: 'eq',
  effect: 'require',
  value: { kind: 'scalar', value: 'raw-criteria-secret' },
  unknown: 'exclude',
}

const context: FilterContextDefinition = {
  key: 'observability.test',
  version: 1,
  resource: 'test',
  ownerModule: 'filtering',
  capabilities: {
    text: false,
    facets: false,
    nestedGroups: true,
    preferences: false,
    relativeTime: false,
    savedViews: false,
    sharedViews: false,
    alerts: false,
    emptyRequest: false,
    pagination: 'cursor',
    maxDepth: 3,
    maxConditions: 10,
  },
  fields: [
    {
      key: 'status',
      type: 'scalar',
      operators: ['eq'],
      effects: ['require'],
      defaultUnknown: 'exclude',
      facetable: false,
      sortable: true,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: [],
      cost: 1,
    },
  ],
  sorts: [{ field: 'status', directions: ['asc'] }],
  defaultSort: [{ field: 'status', direction: 'asc' }],
  executionProfile: 'fake-sql',
  degradationPolicy: 'explicit_partial',
  limits: {
    maxPageSize: 20,
    maxFacetRequests: 0,
    maxProjectionFields: 1,
    maxSorts: 1,
    maxSetValues: 5,
    maxTextLength: 80,
    maxRelationDepth: 1,
    maxCost: 10,
  },
}

const criteria: QueryCriteriaRequest = {
  context: context.key,
  schemaVersion: context.version,
  filter: userFilter,
  sort: [{ field: 'status', direction: 'asc' }],
  page: { size: 10 },
}

class RecordingSink {
  readonly events: FilterObservabilityEvent[] = []

  record(event: FilterObservabilityEvent): void {
    this.events.push(event)
  }
}

class FakeExecutor implements FilterQueryExecutor<{ id: string }> {
  readonly profile = 'fake-sql'
  degraded = false
  failure: Error | undefined

  describeCapabilities(): FilterExecutorCapabilities {
    return {
      text: false,
      facets: false,
      nestedGroups: true,
      preferences: false,
      relativeTime: false,
      relations: false,
      pagination: ['cursor'],
      facetCountModes: [],
      totalRelations: ['eq'],
      maxDepth: 5,
      maxConditions: 100,
      maxPageSize: 100,
      maxFacetRequests: 10,
      maxProjectionFields: 10,
      maxSorts: 3,
      maxCost: 100,
      fieldOperators: { status: ['eq'] },
    }
  }

  estimateCost(): Promise<number> {
    return Promise.resolve(1)
  }

  execute(input: FilterExecutorInput): Promise<FilterExecutorResult<{ id: string }>> {
    if (this.failure) return Promise.reject(this.failure)
    return Promise.resolve({
      hits: [{ id: 'result-1' }],
      total: { value: this.degraded ? 1 : 1, relation: 'eq' },
      facets: [],
      suggestions: [],
      diagnostics: this.degraded
        ? [{ code: 'FILTER_PROVIDER_DEGRADED', severity: 'warning' as const }]
        : [],
      page: {},
      provider: this.profile,
      degraded: this.degraded,
      partial: this.degraded,
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

function permissionProvider(): FilterPermissionConstraintProvider {
  const constraint: FilterPermissionConstraint = {
    fieldBindings: [],
    authorizationVersion: 'permission-v1',
  }
  return { buildMandatoryExpression: () => Promise.resolve(constraint) }
}

function makeQuery(sink: RecordingSink, executor = new FakeExecutor()): ExecuteFilterQuery {
  const contextProvider: FilterContextProvider = {
    getEffectiveDefinition: () => Promise.resolve(context),
  }
  const resolver: FilterQueryExecutorResolver = { getExecutor: () => executor }
  return new ExecuteFilterQuery({
    contextProvider,
    permissionProvider: permissionProvider(),
    executorResolver: resolver,
    observabilitySink: sink,
    timeoutMs: 50,
    hashGenerator: new NodeFilterHashGenerator(),
  })
}

test.group('Unit | Execute filter query | Observability', () => {
  test('records a redacted success event without raw criteria', async ({ assert }) => {
    const sink = new RecordingSink()
    await makeQuery(sink).execute({ criteria, principal, requestId: 'request-success' })

    assert.lengthOf(sink.events, 1)
    assert.equal(sink.events[0]?.outcome, 'success')
    assert.match(sink.events[0]?.criteria_hash ?? '', /^sha256:[0-9a-f]{64}$/u)
    assert.notInclude(JSON.stringify(sink.events[0]), 'raw-criteria-secret')
    assert.notProperty(sink.events[0], 'criteria')
  })

  test('records a degraded event when the provider returns partial results', async ({ assert }) => {
    const sink = new RecordingSink()
    const executor = new FakeExecutor()
    executor.degraded = true

    const response = await makeQuery(sink, executor).execute({
      criteria,
      principal,
      requestId: 'request-degraded',
    })

    assert.isTrue(response.execution.degraded)
    assert.lengthOf(sink.events, 1)
    assert.equal(sink.events[0]?.outcome, 'degraded')
    assert.isTrue(sink.events[0]?.result.partial)
    assert.notInclude(JSON.stringify(sink.events[0]), 'raw-criteria-secret')
  })

  test('records a failure event while preserving the safe execution error', async ({ assert }) => {
    const sink = new RecordingSink()
    const executor = new FakeExecutor()
    executor.failure = new Error('provider raw secret')

    try {
      await makeQuery(sink, executor).execute({ criteria, principal, requestId: 'request-failure' })
      assert.fail('expected execution to fail')
    } catch (error) {
      assert.instanceOf(error, FilterExecutionError)
      assert.equal((error as FilterExecutionError).code, 'FILTER_EXECUTOR_UNAVAILABLE')
    }

    assert.lengthOf(sink.events, 1)
    assert.equal(sink.events[0]?.outcome, 'failure')
    assert.equal(sink.events[0]?.error?.code, 'FILTER_DIAGNOSTIC_REDACTED')
    assert.notInclude(JSON.stringify(sink.events[0]), 'provider raw secret')
    assert.notInclude(JSON.stringify(sink.events[0]), 'raw-criteria-secret')
  })
})
