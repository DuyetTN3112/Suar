import { test } from '@japa/runner'

import type {
  FilterPermissionConstraint,
  FilterPermissionConstraintProvider,
} from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type {
  FilterAuthorizationBinding,
  FilterExecutorCapabilities,
  FilterExecutorInput,
  FilterExecutorResult,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type {
  QueryCriteriaRequest,
  QueryCriteriaResponse,
} from '#modules/filtering/public_contracts/filter_query'

const principal: FilterPrincipal = {
  kind: 'user',
  id: 'user-1',
  organizationId: 'org-a',
  authorizationVersion: 'grant-7',
}

const mandatory: FilterExpression = {
  kind: 'condition',
  field: 'tenantScope',
  operator: 'eq',
  effect: 'require',
  value: { kind: 'scalar', value: 'tenant-secret-a' },
  unknown: 'exclude',
}

function constraint(
  overrides: Partial<FilterPermissionConstraint> = {}
): FilterPermissionConstraint {
  return {
    expression: mandatory,
    fieldBindings: [
      {
        field: 'tenantScope',
        type: 'scalar',
        operators: ['eq'],
        effects: ['require'],
      },
    ],
    authorizationVersion: 'permission-7',
    ...overrides,
  }
}

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
    defaultFilter: {
      kind: 'condition',
      field: 'status',
      operator: 'eq',
      effect: 'require',
      value: { kind: 'scalar', value: 'open' },
      unknown: 'exclude',
    },
    defaultSort: [{ field: 'status', direction: 'asc' }],
    executionProfile: 'secure-fake',
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

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: 'marketplace.tasks',
    schemaVersion: 3,
    sort: [],
    requestedFacets: [{ field: 'status', countMode: 'constrained' }],
    page: { size: 20 },
    ...overrides,
  }
}

function evidence(binding: FilterAuthorizationBinding) {
  return {
    hits: binding,
    total: binding,
    facets: binding,
    suggestions: binding,
    page: binding,
  }
}

function lastValue<T>(values: readonly T[], index: number): T {
  const value = values[Math.min(index, values.length - 1)]
  if (value === undefined) throw new Error('Test fixture must not be empty')
  return value
}

class SecureExecutor implements FilterQueryExecutor<{ id: string }> {
  readonly profile = 'secure-fake'
  inputs: FilterExecutorInput[] = []
  mutateResult?: (
    result: FilterExecutorResult<{ id: string }>,
    input: FilterExecutorInput
  ) => FilterExecutorResult<{ id: string }> | unknown
  neverResolve = false
  failure?: FilterExecutionError
  capabilityOverrides: Partial<FilterExecutorCapabilities> = {}

  describeCapabilities() {
    const capabilities: FilterExecutorCapabilities = {
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
      fieldOperators: { status: ['eq', 'in'], tenantScope: ['eq'] },
      ...this.capabilityOverrides,
    }
    return capabilities
  }

  estimateCost() {
    return Promise.resolve(1)
  }

  execute(input: FilterExecutorInput): Promise<FilterExecutorResult<{ id: string }>> {
    this.inputs.push(input)
    if (this.failure !== undefined) return Promise.reject(this.failure)
    if (this.neverResolve) return new Promise(() => undefined)
    const result: FilterExecutorResult<{ id: string }> = {
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
      page: {},
      provider: this.profile,
      degraded: false,
      partial: false,
      authorizationEvidence: evidence(input.authorizationBinding),
    }
    return Promise.resolve(
      (this.mutateResult === undefined
        ? result
        : this.mutateResult(result, input)) as FilterExecutorResult<{
        id: string
      }>
    )
  }
}

function harness(
  overrides: {
    executor?: SecureExecutor
    definitions?: FilterContextDefinition[]
    constraints?: FilterPermissionConstraint[]
    timeoutMs?: number
  } = {}
) {
  const executor = overrides.executor ?? new SecureExecutor()
  let definitionCall = 0
  let permissionCall = 0
  const definitions = overrides.definitions ?? [definition()]
  const constraints = overrides.constraints ?? [constraint()]
  const permissionProvider: FilterPermissionConstraintProvider = {
    buildMandatoryExpression: () => Promise.resolve(lastValue(constraints, permissionCall++)),
  }
  return {
    executor,
    query: new ExecuteFilterQuery({
      contextProvider: {
        getEffectiveDefinition: () => Promise.resolve(lastValue(definitions, definitionCall++)),
      },
      permissionProvider,
      executorResolver: { getExecutor: () => executor },
      timeoutMs: overrides.timeoutMs ?? 100,
      hashGenerator: new NodeFilterHashGenerator(),
    }),
  }
}

test.group('Execute filter query security hardening', () => {
  test('binds server-only permission fields and carries immutable provenance separately', async ({
    assert,
  }) => {
    const { query, executor } = harness()
    await query.execute({ criteria: criteria(), principal, requestId: 'req-bound' })

    const input = executor.inputs[0]
    assert.exists(input)
    if (input === undefined) throw new Error('Expected executor input')
    assert.deepEqual(input.mandatoryFilter, mandatory)
    assert.equal(input.authorizationBinding.context, 'marketplace.tasks')
    assert.equal(input.authorizationBinding.authorizationVersion, 'permission-7')
    assert.isTrue(Object.isFrozen(input.authorizationBinding))
    assert.deepEqual(input.eligibilityFilter, {
      kind: 'group',
      combinator: 'and',
      children: [mandatory, definition().defaultFilter],
    })
  })

  test('rejects an unbound mandatory field before executor invocation', async ({ assert }) => {
    const { query, executor } = harness({
      constraints: [constraint({ fieldBindings: [] })],
    })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-unbound' })
    )

    assert.equal(error.code, 'FILTER_PERMISSION_INVALID')
    assert.lengthOf(executor.inputs, 0)
    assert.notInclude(JSON.stringify(error), 'tenantScope')
  })

  test('rejects omitted or forged per-section authorization evidence', async ({ assert }) => {
    for (const mutateResult of [
      (result: FilterExecutorResult<{ id: string }>) => ({
        ...result,
        authorizationEvidence: undefined,
      }),
      (result: FilterExecutorResult<{ id: string }>, input: FilterExecutorInput) => ({
        ...result,
        authorizationEvidence: evidence(structuredClone(input.authorizationBinding)),
      }),
    ]) {
      const executor = new SecureExecutor()
      executor.mutateResult = mutateResult
      const { query } = harness({ executor })
      const error = await captureExecutionError(
        query.execute({ criteria: criteria(), principal, requestId: 'req-evidence' })
      )
      assert.equal(error.code, 'FILTER_EXECUTOR_RESPONSE_INVALID')
    }
  })

  test('rejects unrequested facet and suggestion output instead of exposing raw provider data', async ({
    assert,
  }) => {
    for (const patch of [
      {
        facets: [
          {
            field: 'hiddenSalary',
            countMode: 'constrained' as const,
            values: [
              { value: 'secret-band', count: 9, countRelation: 'exact' as const, selected: false },
            ],
          },
        ],
      },
      { suggestions: ['hidden candidate name'] },
      { total: { value: -1, relation: 'eq' as const } },
    ]) {
      const executor = new SecureExecutor()
      executor.mutateResult = (result) => ({ ...result, ...patch })
      const { query } = harness({ executor })
      const error = await captureExecutionError(
        query.execute({ criteria: criteria(), principal, requestId: 'req-raw-output' })
      )
      assert.equal(error.code, 'FILTER_EXECUTOR_RESPONSE_INVALID')
      assert.notInclude(JSON.stringify(error), 'hiddenSalary')
      assert.notInclude(JSON.stringify(error), 'hidden candidate name')
    }
  })

  test('rebuilds the effective context after execution and discards changed authorization', async ({
    assert,
  }) => {
    const changed = definition({ defaultSort: [{ field: 'status', direction: 'desc' }] })
    const { query, executor } = harness({ definitions: [definition(), changed] })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-context-changed' })
    )

    assert.equal(error.code, 'FILTER_PERMISSION_CHANGED')
    assert.lengthOf(executor.inputs, 1)
  })

  test('applies validated default filter and sort before cost and execution', async ({
    assert,
  }) => {
    const { query, executor } = harness()
    const response = await query.execute({
      criteria: criteria(),
      principal,
      requestId: 'req-defaults',
    })

    assert.deepEqual(response.canonicalCriteria.filter, definition().defaultFilter)
    assert.deepEqual(response.canonicalCriteria.sort, definition().defaultSort)
    assert.deepEqual(executor.inputs[0]?.criteria, response.canonicalCriteria)
  })

  test('checks operator, facet-mode, and relation capabilities again at runtime', async ({
    assert,
  }) => {
    const relationField = {
      key: 'assignee',
      type: 'relation' as const,
      operators: ['related_exists'],
      effects: ['require'] as const,
      defaultUnknown: 'exclude' as const,
      facetable: false,
      sortable: false,
      projectable: false,
      preference: false,
      valueSearch: false,
      facetCountModes: [],
      cost: 1,
    }
    for (const [effectiveDefinition, capabilityOverrides] of [
      [definition(), { fieldOperators: { status: ['eq'], tenantScope: ['eq'] } }],
      [definition(), { facetCountModes: [] }],
      [
        definition({ fields: [...definition().fields, relationField] }),
        {
          relations: false,
          fieldOperators: {
            status: ['eq', 'in'],
            tenantScope: ['eq'],
            assignee: ['related_exists'],
          },
        },
      ],
    ] as const) {
      const executor = new SecureExecutor()
      executor.capabilityOverrides = capabilityOverrides
      const { query } = harness({ executor, definitions: [effectiveDefinition] })
      const error = await captureExecutionError(
        query.execute({ criteria: criteria(), principal, requestId: 'req-runtime-capability' })
      )
      assert.equal(error.code, 'FILTER_EXECUTOR_CAPABILITY_MISMATCH')
      assert.lengthOf(executor.inputs, 0)
    }
  })

  test('fails closed for malformed runtime envelopes and approximate truth without opt-in', async ({
    assert,
  }) => {
    for (const mutation of [
      () => null,
      (result: FilterExecutorResult<{ id: string }>) => ({ ...result, total: null }),
      (result: FilterExecutorResult<{ id: string }>) => ({
        ...result,
        facets: [
          {
            ...(result.facets[0] ?? {
              field: 'status',
              countMode: 'constrained',
              values: [],
            }),
            values: [{ value: 'open', count: 1, countRelation: 'approximate', selected: true }],
          },
        ],
      }),
    ]) {
      const executor = new SecureExecutor()
      executor.mutateResult = mutation
      const { query } = harness({ executor })
      const error = await captureExecutionError(
        query.execute({ criteria: criteria(), principal, requestId: 'req-malformed' })
      )
      assert.equal(error.code, 'FILTER_EXECUTOR_RESPONSE_INVALID')
    }
  })

  test('aborts an in-flight executor and times out a stuck executor safely', async ({ assert }) => {
    const abortingExecutor = new SecureExecutor()
    abortingExecutor.neverResolve = true
    const aborting = harness({ executor: abortingExecutor, timeoutMs: 1_000 })
    const controller = new AbortController()
    const pending = aborting.query.execute({
      criteria: criteria(),
      principal,
      requestId: 'req-abort',
      signal: controller.signal,
    })
    controller.abort()
    const abortError = await captureExecutionError(pending)
    assert.equal(abortError.code, 'FILTER_REQUEST_ABORTED')

    const stuckExecutor = new SecureExecutor()
    stuckExecutor.neverResolve = true
    const stuck = harness({ executor: stuckExecutor, timeoutMs: 5 })
    const timeoutError = await captureExecutionError(
      stuck.query.execute({ criteria: criteria(), principal, requestId: 'req-timeout' })
    )
    assert.equal(timeoutError.code, 'FILTER_PROVIDER_TIMED_OUT')
  })

  test('preserves bounded cursor diagnostics raised by the executor boundary', async ({
    assert,
  }) => {
    for (const code of [
      'FILTER_CURSOR_INVALID',
      'FILTER_CURSOR_EXPIRED',
      'FILTER_CURSOR_STALE',
    ] as const) {
      const executor = new SecureExecutor()
      executor.failure = new FilterExecutionError(code)
      const { query } = harness({ executor })

      const error = await captureExecutionError(
        query.execute({ criteria: criteria(), principal, requestId: `req-${code}` })
      )
      assert.equal(error.code, code)
    }
  })
})

async function captureExecutionError(
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
