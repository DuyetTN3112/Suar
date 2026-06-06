import { test } from '@japa/runner'

import type {
  FilterExecutorCapabilities,
  FilterQueryExecutor,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import {
  FilterExecutorRegistry,
  FilterExecutorRegistryError,
} from '#modules/filtering/actions/queries/internal/filter_executor_registry'

function capabilities(
  overrides: Partial<FilterExecutorCapabilities> = {}
): FilterExecutorCapabilities {
  return {
    text: true,
    facets: true,
    nestedGroups: true,
    preferences: true,
    relativeTime: true,
    relations: true,
    pagination: ['cursor', 'offset'],
    facetCountModes: ['constrained', 'self_excluding'],
    totalRelations: ['eq', 'gte', 'unknown'],
    maxDepth: 6,
    maxConditions: 100,
    maxPageSize: 100,
    maxFacetRequests: 20,
    maxProjectionFields: 30,
    maxSorts: 4,
    maxCost: 1_000,
    fieldOperators: {
      status: ['eq', 'in'],
      skills: ['contains_any', 'contains_all', 'contains_none'],
    },
    ...overrides,
  }
}

function executor(
  profile: string,
  advertised: FilterExecutorCapabilities = capabilities()
): FilterQueryExecutor {
  return {
    profile,
    describeCapabilities: () => advertised,
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

function captureError(callback: () => unknown): FilterExecutorRegistryError {
  try {
    callback()
  } catch (error) {
    if (error instanceof FilterExecutorRegistryError) return error
    throw error
  }
  throw new Error('Expected FilterExecutorRegistryError')
}

test.group('Filter executor profile registry', () => {
  test('fails closed before initialize, rejects duplicate profiles, and seals after startup', ({
    assert,
  }) => {
    const registry = new FilterExecutorRegistry()
    registry.register(executor('sql'))

    assert.deepEqual(captureError(() => registry.getExecutor('sql')).codes, [
      'FILTER_EXECUTOR_REGISTRY_NOT_INITIALIZED',
    ])
    assert.deepEqual(captureError(() => registry.register(executor('sql'))).codes, [
      'FILTER_EXECUTOR_REGISTRY_DUPLICATE',
    ])

    registry.initialize()
    assert.equal(registry.getExecutor('sql')?.profile, 'sql')
    assert.isUndefined(registry.getExecutor('unknown'))
    assert.deepEqual(captureError(() => registry.register(executor('late'))).codes, [
      'FILTER_EXECUTOR_REGISTRY_SEALED',
    ])
  })

  test('reports every missing required profile deterministically without leaking requirement data', ({
    assert,
  }) => {
    const registry = new FilterExecutorRegistry()
    registry.require({ profile: 'search', capabilities: capabilities() })
    registry.require({ profile: 'sql', capabilities: capabilities() })

    const error = captureError(() => registry.initialize())
    assert.deepEqual(error.codes, ['FILTER_EXECUTOR_REGISTRY_MISSING'])
    assert.equal(error.message, 'Filter executor registry configuration is invalid')
    assert.notInclude(JSON.stringify(error), 'search')
    assert.notInclude(JSON.stringify(error), 'sql')
  })

  test('validates Boolean flags, enum subsets, limits, and field/operator subsets at startup', ({
    assert,
  }) => {
    const registry = new FilterExecutorRegistry()
    registry.register(
      executor(
        'search',
        capabilities({
          facets: false,
          pagination: ['offset'],
          totalRelations: ['gte'],
          maxDepth: 2,
          fieldOperators: { status: ['eq'] },
        })
      )
    )
    registry.require({ profile: 'search', capabilities: capabilities() })

    assert.deepEqual(captureError(() => registry.initialize()).codes, [
      'FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH',
    ])
  })

  test('fails closed for duplicate requirements and malformed or throwing capability providers', ({
    assert,
  }) => {
    const duplicate = new FilterExecutorRegistry()
    duplicate.require({ profile: 'sql', capabilities: capabilities() })
    assert.deepEqual(
      captureError(() => duplicate.require({ profile: 'sql', capabilities: capabilities() })).codes,
      ['FILTER_EXECUTOR_REGISTRY_REQUIREMENT_DUPLICATE']
    )

    for (const badExecutor of [
      {
        ...executor('bad'),
        describeCapabilities: () => {
          throw new Error('secret provider configuration')
        },
      },
      executor('bad', { fieldOperators: null } as unknown as FilterExecutorCapabilities),
    ]) {
      const registry = new FilterExecutorRegistry()
      registry.register(badExecutor)
      registry.require({ profile: 'bad', capabilities: capabilities() })
      const error = captureError(() => registry.initialize())
      assert.deepEqual(error.codes, ['FILTER_EXECUTOR_REGISTRY_CAPABILITY_MISMATCH'])
      assert.notInclude(error.message, 'secret')
    }
  })
})
