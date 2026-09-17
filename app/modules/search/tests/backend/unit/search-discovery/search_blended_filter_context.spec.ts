import { test } from '@japa/runner'

import { filterContextProvider } from '#composition/filtering/filter-runtime/filtering_composition'
import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'
import { SEARCH_BLENDED_CONTEXT } from '#modules/search/public_contracts/search_discovery_contract'

test.group('Search blended filter context', () => {
  test('exposes authenticated saved-view capabilities with organization sharing but no alerts or generic execution', async ({
    assert,
  }) => {
    const definition = await filterContextProvider.getEffectiveDefinition({
      context: SEARCH_BLENDED_CONTEXT,
      principal: {
        kind: 'user',
        id: 'search-owner-1',
      },
    })

    assert.equal(definition.key, SEARCH_BLENDED_CONTEXT)
    assert.equal(definition.ownerModule, 'search')
    assert.deepEqual(definition.capabilities, {
      text: true,
      facets: false,
      nestedGroups: false,
      preferences: false,
      relativeTime: false,
      savedViews: true,
      sharedViews: true,
      alerts: false,
      emptyRequest: false,
      pagination: 'none',
      maxDepth: 0,
      maxConditions: 0,
    })
    assert.deepEqual(definition.fields, [])
    assert.deepEqual(definition.sorts, [])
    assert.isUndefined(definition.defaultFilter)
    assert.deepEqual(definition.defaultSort, [])
  })

  test('rejects anonymous, service, missing-identity, and non-search contexts', async ({
    assert,
  }) => {
    const inputs = [
      { context: SEARCH_BLENDED_CONTEXT, principal: { kind: 'anonymous' as const } },
      {
        context: SEARCH_BLENDED_CONTEXT,
        principal: { kind: 'service' as const, id: 'search-service-1' },
      },
      {
        context: SEARCH_BLENDED_CONTEXT,
        principal: { kind: 'user' as const },
      },
      {
        context: 'search.blended.other',
        principal: {
          kind: 'user' as const,
          id: 'search-owner-1',
        },
      },
    ]

    for (const input of inputs) {
      await assert.rejects(
        () => filterContextProvider.getEffectiveDefinition(input),
        FilterContextResolutionError
      )
    }
  })
})
