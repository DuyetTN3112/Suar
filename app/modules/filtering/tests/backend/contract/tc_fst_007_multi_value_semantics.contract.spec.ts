import { test } from '@japa/runner'

import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import {
  tcFst007Condition,
  tcFst007Criteria,
  tcFst007Evaluator,
  tcFst007FilterIds,
} from '#modules/filtering/tests/backend/contract/support/tc_fst_007_multi_value_semantics'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import {
  compileElasticsearchFilter,
  type ElasticsearchSemanticBindings,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'

const NOW = new Date('2026-08-01T00:00:00.000Z')
const PRINCIPAL: FilterPrincipal = { kind: 'anonymous' }

const bindings: ElasticsearchSemanticBindings = {
  id: { type: 'scalar', path: 'id' },
  skills: {
    type: 'multi_value',
    path: 'skills',
    presencePath: 'skills_known',
    cardinalityPath: 'skills_count',
  },
}

function searchHit(id: string): SearchDiscoveryHit<{ id: string }> {
  return {
    id: `task:${id}`,
    entityType: 'task',
    entityId: id,
    source: 'tasks',
    rank: 0,
    document: { id },
  }
}

function searchCriteria(filter: QueryCriteriaRequest['filter']): QueryCriteriaRequest {
  return {
    ...tcFst007Criteria(filter ?? tcFst007Condition('is_empty')),
    context: 'tasks.discovery.public',
  }
}

test.group('Contract | TC-FST-007 multi-value state semantics', () => {
  test('keeps known-empty distinct and applies explicit unknown policy to missing, unknown, and hidden', async ({
    assert,
  }) => {
    const probe = tcFst007Condition('contains_any', ['typescript'])
    assert.deepEqual(await tcFst007FilterIds(probe), ['known-values'])
    assert.deepEqual(
      await tcFst007FilterIds(tcFst007Condition('contains_any', ['typescript'], 'include')),
      ['hidden', 'known-values', 'missing', 'unknown']
    )
    assert.deepEqual(await tcFst007FilterIds(tcFst007Condition('is_empty')), ['known-empty'])
  })

  test('preserves Boolean false and numeric zero as selected multi-values', async ({ assert }) => {
    assert.deepEqual(
      await tcFst007FilterIds(tcFst007Condition('contains_any', [false, 0])),
      ['known-values']
    )

    const compiled = compileElasticsearchFilter(
      tcFst007Condition('contains_all', [false, 0]),
      bindings,
      NOW
    )
    assert.deepEqual(compiled, {
      bool: {
        filter: [
          { exists: { field: 'skills_known' } },
          {
            terms_set: {
              skills: {
                terms: [false, 0],
                minimum_should_match_script: { source: 'params.num_terms' },
              },
            },
          },
        ],
      },
    })
  })

  test('passes Filter semantics through Search without exposing a hidden reason', async ({
    assert,
  }) => {
    const evaluator = tcFst007Evaluator()
    const query = new SearchDiscoveryQuery({
      verticals: [
        {
          scope: 'task',
          source: 'tasks',
          contexts: ['tasks.discovery.public'],
          rankingVersion: 'tc-fst-007.v1',
          supportedRetrievalModes: ['auto'],
          execute: async (input) => {
            const result = await evaluator.execute(
              evaluator.createConformanceInput({
                criteria: {
                  ...input.criteria,
                  context: 'filter.reference.conformance',
                  filter: input.criteria.filter,
                },
              })
            )
            return {
              ...result,
              context: input.criteria.context,
              schemaVersion: input.criteria.schemaVersion,
              canonicalCriteria: input.criteria,
              hits: result.hits.map(({ id }) => searchHit(id)),
              execution: {
                provider: result.provider,
                degraded: result.degraded,
                partial: result.partial,
                requestId: input.requestId,
              },
            }
          },
        },
      ],
    })

    const response = await query.execute({
      request: {
        criteria: searchCriteria(tcFst007Condition('contains_any', ['typescript'], 'include')),
        search: { scope: 'task' },
      },
      principal: PRINCIPAL,
      requestId: 'tc-fst-007-search',
    })

    assert.deepEqual(
      response.hits.map(({ entityId }) => entityId).sort(),
      ['hidden', 'known-values', 'missing', 'unknown']
    )
    const serialized = JSON.stringify(response)
    assert.notInclude(serialized, 'hidden-reason')
    assert.notInclude(serialized, 'permission-secret')
    assert.notInclude(serialized, '"kind":"hidden"')
  })
})
