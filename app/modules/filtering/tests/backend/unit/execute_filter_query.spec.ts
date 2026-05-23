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
import type {
  FilterContextProvider,
  FilterPrincipal,
} from '#modules/filtering/public_contracts/filter_context_provider'
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

function defaultUserFilter(): FilterExpression {
  return {
    kind: 'condition',
    field: 'status',
    operator: 'eq',
    effect: 'require',
    value: { kind: 'scalar', value: 'open' },
    unknown: 'exclude',
  }
}

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
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

const mandatory: FilterExpression = {
  kind: 'condition',
  field: 'tenantScope',
  operator: 'eq',
  effect: 'require',
  value: { kind: 'scalar', value: 'tenant-secret-a' },
  unknown: 'exclude',
}

class FakeExecutor implements FilterQueryExecutor<{ id: string }> {
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

function permissionConstraint(
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

function harness(
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

test.group('Execute filter query orchestration', () => {
  test('EXE-005 composes mandatory AND user eligibility before every provider output', async ({
    assert,
  }) => {
    const { query, fakeExecutor } = harness()
    const response = await query.execute<{ id: string }>({
      criteria: criteria(),
      principal,
      requestId: 'req-filter-1',
    })

    assert.lengthOf(fakeExecutor.inputs, 1)
    assert.deepEqual(fakeExecutor.inputs[0]?.eligibilityFilter, {
      kind: 'group',
      combinator: 'and',
      children: [mandatory, criteria().filter],
    })
    assert.deepEqual(fakeExecutor.inputs[0]?.mandatoryFilter, mandatory)
    assert.deepEqual(response.hits, [{ id: 'visible-1' }])
    assert.deepEqual(response.total, { value: 1, relation: 'eq' })
    assert.equal(response.facets[0]?.values[0]?.count, 1)
    assert.deepEqual(response.suggestions, [])
    assert.equal(response.execution.requestId, 'req-filter-1')
    assert.deepEqual(response.canonicalCriteria.filter, criteria().filter)
    assert.notInclude(JSON.stringify(response), 'tenantScope')
    assert.notInclude(JSON.stringify(response), 'tenant-secret-a')
  })

  test('rejects user attempts to filter or negate a server-only permission field', async ({
    assert,
  }) => {
    const { query, fakeExecutor } = harness()
    const error = await captureExecutionError(
      query.execute({
        criteria: criteria({
          filter: {
            kind: 'group',
            combinator: 'and',
            negated: true,
            children: [mandatory, defaultUserFilter()],
          },
        }),
        principal,
        requestId: 'req-hidden-probe',
      })
    )

    assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
    assert.lengthOf(fakeExecutor.inputs, 0)
    assert.notInclude(JSON.stringify(error), 'tenantScope')
    assert.notInclude(JSON.stringify(error), 'tenant-secret-a')
  })

  test('fails closed for unknown/stale context and missing executor profile', async ({
    assert,
  }) => {
    for (const [input, expected] of [
      [criteria({ context: 'unknown.context' }), 'FILTER_CONTEXT_MISMATCH'],
      [criteria({ schemaVersion: 2 }), 'FILTER_SCHEMA_VERSION_MISMATCH'],
    ] as const) {
      const { query, fakeExecutor } = harness()
      const error = await captureExecutionError(
        query.execute({ criteria: input, principal, requestId: 'req-context' })
      )
      assert.equal(error.code, expected)
      assert.lengthOf(fakeExecutor.inputs, 0)
    }

    const missing = harness({ missingExecutor: true })
    const missingError = await captureExecutionError(
      missing.query.execute({ criteria: criteria(), principal, requestId: 'req-profile' })
    )
    assert.equal(missingError.code, 'FILTER_EXECUTOR_UNAVAILABLE')
  })

  test('fails closed with safe diagnostics when context, permission, or executor fails', async ({
    assert,
  }) => {
    const cases = [
      [
        harness({ contextFailure: new Error('context-secret-canary') }),
        'FILTER_CONTEXT_UNAVAILABLE',
      ],
      [
        harness({ permissionFailure: new Error('permission-secret-canary') }),
        'FILTER_PERMISSION_UNAVAILABLE',
      ],
    ] as const
    for (const [subject, code] of cases) {
      const error = await captureExecutionError(
        subject.query.execute({ criteria: criteria(), principal, requestId: 'req-failure' })
      )
      assert.equal(error.code, code)
      assert.notInclude(JSON.stringify(error), 'secret-canary')
      assert.lengthOf(subject.fakeExecutor.inputs, 0)
    }

    const failingExecutor = new FakeExecutor()
    failingExecutor.failure = new Error('executor-secret-canary')
    const subject = harness({ executor: failingExecutor })
    const error = await captureExecutionError(
      subject.query.execute({ criteria: criteria(), principal, requestId: 'req-executor-failure' })
    )
    assert.equal(error.code, 'FILTER_EXECUTOR_UNAVAILABLE')
    assert.notInclude(JSON.stringify(error), 'executor-secret-canary')
  })

  test('times out permission resolution without executing or fabricating empty truth', async ({
    assert,
  }) => {
    const fakeExecutor = new FakeExecutor()
    const query = new ExecuteFilterQuery({
      contextProvider: { getEffectiveDefinition: () => Promise.resolve(definition()) },
      permissionProvider: { buildMandatoryExpression: () => new Promise(() => undefined) },
      executorResolver: { getExecutor: () => fakeExecutor },
      timeoutMs: 5,
      hashGenerator: new NodeFilterHashGenerator(),
    })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-timeout' })
    )
    assert.equal(error.code, 'FILTER_PERMISSION_UNAVAILABLE')
    assert.lengthOf(fakeExecutor.inputs, 0)
  })

  test('rejects cursor/offset conflicts and pagination modes before execution', async ({
    assert,
  }) => {
    for (const request of [
      criteria({ page: { size: 20, cursor: 'cursor', offset: 0 } }),
      criteria({ page: { size: 20, offset: 0 } }),
      criteria({ page: { size: 51 } }),
    ]) {
      const { query, fakeExecutor } = harness()
      const error = await captureExecutionError(
        query.execute({ criteria: request, principal, requestId: 'req-page' })
      )
      assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
      assert.lengthOf(fakeExecutor.inputs, 0)
    }
  })

  test('AST-002 rejects an over-depth expression before provider cost or execution', async ({
    assert,
  }) => {
    const nested = (depth: number): FilterExpression =>
      depth === 0
        ? defaultUserFilter()
        : {
            kind: 'group',
            combinator: 'and',
            children: [nested(depth - 1), defaultUserFilter()],
          }
    const { query, fakeExecutor } = harness()
    const error = await captureExecutionError(
      query.execute({
        criteria: criteria({ filter: nested(4) }),
        principal,
        requestId: 'req-ast-002-depth',
      })
    )

    assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
    assert.equal(fakeExecutor.estimateCalls, 0)
    assert.lengthOf(fakeExecutor.inputs, 0)
  })

  test('uses a dedicated cursor bound without raising the text-query limit', async ({ assert }) => {
    const cursor = `cursor.${'x'.repeat(900)}`
    const fakeExecutor = new FakeExecutor()
    fakeExecutor.result = {
      ...fakeExecutor.result,
      page: { nextCursor: cursor },
    }
    const base = definition()
    const subject = harness({
      executor: fakeExecutor,
      effectiveDefinition: definition({
        limits: {
          ...base.limits,
          maxCursorLength: 2_048,
        },
      }),
    })

    const response = await subject.query.execute({
      criteria: criteria({ page: { size: 20, cursor } }),
      principal,
      requestId: 'req-long-opaque-cursor',
    })

    assert.equal(fakeExecutor.inputs[0]?.criteria.page.cursor, cursor)
    assert.equal(response.page.nextCursor, cursor)

    const textError = await captureExecutionError(
      subject.query.execute({
        criteria: criteria({
          filter: {
            kind: 'condition',
            field: 'title',
            operator: 'exact',
            effect: 'require',
            value: { kind: 'scalar', value: 'x'.repeat(129) },
            unknown: 'exclude',
          },
          page: { size: 20 },
        }),
        principal,
        requestId: 'req-text-limit-still-tight',
      })
    )
    assert.equal(textError.code, 'FILTER_CRITERIA_INVALID')
  })

  test('accepts exact self-excluding facet alternatives above the filtered total', async ({
    assert,
  }) => {
    const fakeExecutor = new FakeExecutor()
    fakeExecutor.result = {
      ...fakeExecutor.result,
      hits: [],
      total: { value: 0, relation: 'eq' },
      facets: [
        {
          field: 'status',
          countMode: 'self_excluding',
          values: [
            { value: 'missing', count: 0, countRelation: 'exact', selected: true },
            { value: 'open', count: 3, countRelation: 'exact', selected: false },
          ],
        },
      ],
    }
    const baseCapabilities = fakeExecutor.describeCapabilities()
    fakeExecutor.describeCapabilities = () => ({
      ...baseCapabilities,
      facetCountModes: ['constrained', 'self_excluding'] as const,
    })
    const base = definition()
    const effectiveDefinition = definition({
      fields: base.fields.map((field) =>
        field.key === 'status'
          ? { ...field, facetCountModes: ['constrained', 'self_excluding'] }
          : field
      ),
    })
    const subject = harness({ executor: fakeExecutor, effectiveDefinition })

    const response = await subject.query.execute({
      criteria: criteria({
        requestedFacets: [{ field: 'status', countMode: 'self_excluding' }],
      }),
      principal,
      requestId: 'req-self-excluding-above-total',
    })

    assert.equal(response.total.value, 0)
    assert.equal(response.facets[0]?.values[1]?.count, 3)
  })

  test('preserves an empty sort for text relevance only when the context opts in', async ({
    assert,
  }) => {
    const fakeExecutor = new FakeExecutor()
    const baseCapabilities = fakeExecutor.describeCapabilities()
    fakeExecutor.describeCapabilities = () => ({ ...baseCapabilities, text: true })
    const base = definition()
    const relevanceDefinition = definition({
      capabilities: { ...base.capabilities, text: true },
      presentationHints: { textSort: 'relevance' },
    })
    const subject = harness({ executor: fakeExecutor, effectiveDefinition: relevanceDefinition })

    const textResponse = await subject.query.execute({
      criteria: criteria({ text: { value: 'postgres search' }, sort: [] }),
      principal,
      requestId: 'req-text-relevance-sort',
    })
    const browseResponse = await subject.query.execute({
      criteria: criteria({ sort: [] }),
      principal,
      requestId: 'req-browse-default-sort',
    })

    assert.deepEqual(fakeExecutor.inputs[0]?.criteria.sort, [])
    assert.deepEqual(textResponse.canonicalCriteria.sort, [])
    assert.deepEqual(fakeExecutor.inputs[1]?.criteria.sort, relevanceDefinition.defaultSort)
    assert.deepEqual(browseResponse.canonicalCriteria.sort, relevanceDefinition.defaultSort)

    const compatibilityExecutor = new FakeExecutor()
    const compatibilityCapabilities = compatibilityExecutor.describeCapabilities()
    compatibilityExecutor.describeCapabilities = () => ({
      ...compatibilityCapabilities,
      text: true,
    })
    const compatibility = harness({
      executor: compatibilityExecutor,
      effectiveDefinition: definition({ capabilities: { ...base.capabilities, text: true } }),
    })
    await compatibility.query.execute({
      criteria: criteria({ text: { value: 'postgres search' }, sort: [] }),
      principal,
      requestId: 'req-text-compatible-default-sort',
    })
    assert.deepEqual(compatibilityExecutor.inputs[0]?.criteria.sort, base.defaultSort)
  })

  test('TC-FST-004 applies the context-owned browse, default, and reject policies to an empty request', async ({
    assert,
  }) => {
    const emptyRequest = criteria({ filter: undefined, preferences: undefined, sort: [] })

    const browse = harness({
      effectiveDefinition: definition({
        capabilities: { ...definition().capabilities, emptyRequest: true },
      }),
    })
    const browseResponse = await browse.query.execute({
      criteria: emptyRequest,
      principal,
      requestId: 'req-empty-browse',
    })
    assert.lengthOf(browse.fakeExecutor.inputs, 1)
    assert.isUndefined(browseResponse.canonicalCriteria.filter)

    const defaultFilter = defaultUserFilter()
    const defaulted = harness({
      effectiveDefinition: definition({
        capabilities: { ...definition().capabilities, emptyRequest: false },
        defaultFilter,
      }),
    })
    const defaultResponse = await defaulted.query.execute({
      criteria: emptyRequest,
      principal,
      requestId: 'req-empty-default',
    })
    assert.lengthOf(defaulted.fakeExecutor.inputs, 1)
    assert.deepEqual(defaultResponse.canonicalCriteria.filter, defaultFilter)

    const rejected = harness({
      effectiveDefinition: definition({
        capabilities: { ...definition().capabilities, emptyRequest: false },
      }),
    })
    const error = await captureExecutionError(
      rejected.query.execute({
        criteria: emptyRequest,
        principal,
        requestId: 'req-empty-reject',
      })
    )
    assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
    assert.lengthOf(rejected.fakeExecutor.inputs, 0)
  })

  test('enforces facet, sort, projection, feature, and cost allowlists', async ({ assert }) => {
    const invalidRequests: QueryCriteriaRequest[] = [
      criteria({ requestedFacets: [{ field: 'title' }] }),
      criteria({ requestedFacets: [{ field: 'hiddenSalary' }] }),
      criteria({ sort: [{ field: 'title', direction: 'asc' }] }),
      criteria({ projection: ['hiddenSalary'] }),
      criteria({ text: { value: 'keyword' } }),
      criteria({ preferences: [{ effect: 'prefer', expression: defaultUserFilter() }] }),
    ]
    for (const request of invalidRequests) {
      const { query, fakeExecutor } = harness()
      const error = await captureExecutionError(
        query.execute({ criteria: request, principal, requestId: 'req-allowlist' })
      )
      assert.equal(error.code, 'FILTER_CRITERIA_INVALID')
      assert.lengthOf(fakeExecutor.inputs, 0)
      assert.notInclude(JSON.stringify(error), 'hiddenSalary')
    }

    const expensiveExecutor = new FakeExecutor()
    expensiveExecutor.cost = 11
    const expensive = harness({ executor: expensiveExecutor })
    const costError = await captureExecutionError(
      expensive.query.execute({ criteria: criteria(), principal, requestId: 'req-cost' })
    )
    assert.equal(costError.code, 'FILTER_COST_LIMIT_EXCEEDED')
    assert.lengthOf(expensiveExecutor.inputs, 0)
  })

  test('rejects malformed mandatory AST without leaking the hidden clause', async ({ assert }) => {
    const invalidMandatory = {
      kind: 'condition',
      field: 'hidden-canary-field',
      operator: 'raw_provider_dsl',
      effect: 'require',
      unknown: 'exclude',
    } as unknown as FilterExpression
    const { query, fakeExecutor } = harness({ mandatoryExpression: invalidMandatory })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-invalid-permission' })
    )

    assert.equal(error.code, 'FILTER_PERMISSION_INVALID')
    assert.lengthOf(fakeExecutor.inputs, 0)
    assert.notInclude(JSON.stringify(error), 'hidden-canary-field')
    assert.notInclude(JSON.stringify(error), 'raw_provider_dsl')
  })

  test('propagates explicit executor degradation only when the context opts in', async ({
    assert,
  }) => {
    const degradedExecutor = new FakeExecutor()
    degradedExecutor.result = {
      ...degradedExecutor.result,
      degraded: true,
      partial: true,
      total: { value: 1, relation: 'unknown' },
      diagnostics: [{ code: 'FILTER_PROVIDER_DEGRADED', severity: 'warning' }],
    }

    const strict = harness({ executor: degradedExecutor })
    const strictError = await captureExecutionError(
      strict.query.execute({ criteria: criteria(), principal, requestId: 'req-strict-degraded' })
    )
    assert.equal(strictError.code, 'FILTER_DEGRADED_NOT_ALLOWED')

    const explicit = harness({
      executor: degradedExecutor,
      effectiveDefinition: definition({ degradationPolicy: 'explicit_partial' }),
    })
    const response = await explicit.query.execute({
      criteria: criteria(),
      principal,
      requestId: 'req-explicit-degraded',
    })
    assert.isTrue(response.execution.degraded)
    assert.isTrue(response.execution.partial)
    assert.deepInclude(response.diagnostics, {
      code: 'FILTER_PROVIDER_DEGRADED',
      severity: 'warning',
    })
  })

  test('re-authorizes after execution and discards results when permission changes in flight', async ({
    assert,
  }) => {
    let permissionVersion = 0
    const permissionProvider: FilterPermissionConstraintProvider = {
      buildMandatoryExpression: () => {
        permissionVersion += 1
        const changedExpression: FilterExpression = {
          ...mandatory,
          value: { kind: 'scalar', value: 'tenant-secret-b' },
        }
        const expression = permissionVersion === 1 ? mandatory : changedExpression
        return Promise.resolve(permissionConstraint(expression, `permission-${permissionVersion}`))
      },
    }
    const fakeExecutor = new FakeExecutor()
    const query = new ExecuteFilterQuery({
      contextProvider: { getEffectiveDefinition: () => Promise.resolve(definition()) },
      permissionProvider,
      executorResolver: { getExecutor: () => fakeExecutor },
      timeoutMs: 100,
      hashGenerator: new NodeFilterHashGenerator(),
    })
    const error = await captureExecutionError(
      query.execute({ criteria: criteria(), principal, requestId: 'req-revoked' })
    )

    assert.equal(error.code, 'FILTER_PERMISSION_CHANGED')
    assert.lengthOf(fakeExecutor.inputs, 1)
    assert.notInclude(JSON.stringify(error), 'tenant-secret')
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
