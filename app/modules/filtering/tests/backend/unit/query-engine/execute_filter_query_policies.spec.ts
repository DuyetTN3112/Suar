import { test } from '@japa/runner'

import {
  criteria,
  principal,
  mandatory,
  defaultUserFilter,
  definition,
  FakeExecutor,
  harness,
  captureExecutionError,
  permissionConstraint,
} from '../support/execute_filter_query_test_support.js'

import type { FilterPermissionConstraintProvider } from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'


test.group('Execute filter query policies', () => {
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
          kind: 'condition',
          field: 'tenantScope',
          operator: 'eq',
          effect: 'require',
          value: { kind: 'scalar', value: 'tenant-secret-b' },
          unknown: 'exclude',
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
