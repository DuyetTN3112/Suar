import { test } from '@japa/runner'

import type {
  FilterExecutorCapabilities,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import {
  assertFilterContextExecutorCompatibility,
  FilterRegistryConfigurationError,
  InMemoryFilterContextRegistry,
} from '#modules/filtering/infra/adapters/filtering-runtime/in_memory_filter_context_registry'
import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'

function definition(overrides: Partial<FilterContextDefinition> = {}): FilterContextDefinition {
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
    ],
    sorts: [{ field: 'status', directions: ['asc', 'desc'] }],
    defaultSort: [{ field: 'status', direction: 'asc' }],
    executionProfile: 'fake-sql',
    degradationPolicy: 'fail_closed',
    limits: {
      maxPageSize: 50,
      maxFacetRequests: 5,
      maxProjectionFields: 5,
      maxSorts: 2,
      maxSetValues: 50,
      maxTextLength: 256,
      maxRelationDepth: 1,
      maxCost: 100,
    },
    ...overrides,
  }
}

function capabilities(
  overrides: Partial<FilterExecutorCapabilities> = {}
): FilterExecutorCapabilities {
  return {
    text: false,
    facets: true,
    nestedGroups: true,
    preferences: false,
    relativeTime: false,
    relations: false,
    pagination: ['cursor'],
    facetCountModes: ['constrained'],
    totalRelations: ['eq'],
    maxDepth: 5,
    maxConditions: 100,
    maxPageSize: 100,
    maxFacetRequests: 10,
    maxProjectionFields: 10,
    maxSorts: 3,
    maxCost: 500,
    fieldOperators: { status: ['eq', 'in'], tenantScope: ['eq'] },
    ...overrides,
  }
}

function executor(profile = 'fake-sql'): FilterQueryExecutor {
  return {
    profile,
    describeCapabilities: () => capabilities(),
    estimateCost: () => Promise.resolve(1),
    execute: (input) =>
      Promise.resolve({
        hits: [],
        total: { value: 0, relation: 'eq' },
        facets: [],
        suggestions: [],
        diagnostics: [],
        page: {},
        provider: profile,
        degraded: false,
        partial: false,
        authorizationEvidence: {
          hits: input.authorizationBinding,
          total: input.authorizationBinding,
          facets: input.authorizationBinding,
          suggestions: input.authorizationBinding,
          page: input.authorizationBinding,
        },
      }),
  }
}

test.group('In-memory filter context registry', () => {
  test('resolves effective contexts by principal and hides unauthorized existence', async ({
    assert,
  }) => {
    const registry = new InMemoryFilterContextRegistry()
    registry.registerContext(
      definition(),
      (principal) => principal.organizationId === 'org-visible'
    )
    registry.registerExecutor(executor())
    registry.initialize()

    const visible = await registry.getEffectiveDefinition({
      context: 'marketplace.tasks',
      principal: { kind: 'user', id: 'user-1', organizationId: 'org-visible' },
    })
    assert.equal(visible.version, 3)

    const unauthorized = await captureError(
      registry.getEffectiveDefinition({
        context: 'marketplace.tasks',
        principal: { kind: 'user', id: 'user-2', organizationId: 'org-hidden' },
      })
    )
    const unknown = await captureError(
      registry.getEffectiveDefinition({
        context: 'secret.context',
        principal: { kind: 'user', id: 'user-2', organizationId: 'org-hidden' },
      })
    )
    assert.instanceOf(unauthorized, FilterContextResolutionError)
    assert.instanceOf(unknown, FilterContextResolutionError)
    assert.equal(unauthorized.code, unknown.code)
    assert.equal(unauthorized.message, unknown.message)
    assert.notInclude(JSON.stringify(unauthorized), 'marketplace.tasks')
    assert.notInclude(JSON.stringify(unknown), 'secret.context')
  })

  test('rejects duplicate context keys and executor profiles deterministically', ({ assert }) => {
    const registry = new InMemoryFilterContextRegistry()
    registry.registerContext(definition())
    registry.registerExecutor(executor())

    assert.throws(() => registry.registerContext(definition()), FilterRegistryConfigurationError)
    assert.throws(() => registry.registerExecutor(executor()), FilterRegistryConfigurationError)
    registry.initialize()
    assert.equal(registry.getExecutor('fake-sql').profile, 'fake-sql')
    assert.throws(() => registry.getExecutor('missing-profile'), FilterRegistryConfigurationError)
  })

  test('startup validation proves context fields and capabilities are executor subsets', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      assertFilterContextExecutorCompatibility(definition(), capabilities())
    )

    const incompatible = capabilities({
      facets: false,
      pagination: ['offset'],
      maxDepth: 1,
      fieldOperators: { status: ['eq'] },
    })
    const error = captureSyncError(() =>
      assertFilterContextExecutorCompatibility(definition(), incompatible)
    )
    assert.instanceOf(error, FilterRegistryConfigurationError)
    assert.deepEqual(error.codes, [
      'FILTER_EXECUTOR_CAPABILITY_MISMATCH',
      'FILTER_EXECUTOR_FIELD_BINDING_MISMATCH',
      'FILTER_EXECUTOR_LIMIT_MISMATCH',
      'FILTER_EXECUTOR_PAGINATION_MISMATCH',
    ])
  })

  test('fails closed until mandatory startup initialization and seals registrations', ({
    assert,
  }) => {
    const registry = new InMemoryFilterContextRegistry()
    registry.registerContext(definition())
    registry.registerExecutor(executor())

    assert.throws(() => registry.getExecutor('fake-sql'), FilterRegistryConfigurationError)
    assert.throws(
      () =>
        registry.getEffectiveDefinition({
          context: 'marketplace.tasks',
          principal: { kind: 'user', id: 'user-1' },
        }),
      FilterRegistryConfigurationError
    )

    registry.initialize()
    assert.equal(registry.getExecutor('fake-sql').profile, 'fake-sql')
    assert.throws(
      () => registry.registerExecutor(executor('late')),
      FilterRegistryConfigurationError
    )
    assert.doesNotThrow(() => registry.initialize())
  })

  test('startup rejects invalid defaults and relation/facet/operator runtime mismatches', ({
    assert,
  }) => {
    const invalidDefault = new InMemoryFilterContextRegistry()
    invalidDefault.registerContext(
      definition({ defaultSort: [{ field: 'status', direction: 'sideways' as 'asc' }] })
    )
    invalidDefault.registerExecutor(executor())
    assert.throws(() => invalidDefault.initialize(), FilterRegistryConfigurationError)

    const relationContext = definition({
      fields: [
        {
          key: 'assignee',
          type: 'relation',
          operators: ['related_exists'],
          effects: ['require'],
          defaultUnknown: 'exclude',
          facetable: false,
          sortable: false,
          projectable: false,
          preference: false,
          valueSearch: false,
          facetCountModes: [],
          cost: 1,
        },
      ],
      sorts: [],
      defaultSort: [],
    })
    for (const [context, incompatible] of [
      [definition(), capabilities({ fieldOperators: { status: ['eq'] } })],
      [definition(), capabilities({ facetCountModes: [] })],
      [
        relationContext,
        capabilities({
          relations: false,
          fieldOperators: { assignee: ['related_exists'] },
        }),
      ],
    ] as const) {
      const error = captureSyncError(() =>
        assertFilterContextExecutorCompatibility(context, incompatible)
      )
      assert.instanceOf(error, FilterRegistryConfigurationError)
    }

    const malformed = new InMemoryFilterContextRegistry()
    malformed.registerContext(definition())
    malformed.registerExecutor({
      ...executor(),
      describeCapabilities: () => {
        throw new Error('provider-secret-capability-envelope')
      },
    })
    const malformedError = captureSyncError(() => malformed.initialize())
    assert.deepEqual(malformedError.codes, ['FILTER_EXECUTOR_CAPABILITY_MISMATCH'])
    assert.notInclude(JSON.stringify(malformedError), 'provider-secret')
  })
})

async function captureError(promise: Promise<unknown>): Promise<Error & { code?: string }> {
  try {
    await promise
  } catch (error) {
    return error as Error & { code?: string }
  }
  throw new Error('Expected promise to reject')
}

function captureSyncError(callback: () => void): FilterRegistryConfigurationError {
  try {
    callback()
  } catch (error) {
    if (error instanceof FilterRegistryConfigurationError) return error
    throw error
  }
  throw new Error('Expected callback to throw')
}
