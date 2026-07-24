import { test } from '@japa/runner'

import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'
import {
  TALENT_DISCOVERY_CONTEXTS,
  TALENT_DISCOVERY_EXECUTION_PROFILE,
  TalentDiscoveryFilterContextProvider,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_filter_context'

const EXPECTED_FIELDS = [
  'talent.id',
  'talent.skills',
  'talent.canonicalSkills',
  'talent.skillCategories',
  'talent.skillEvidence',
  'talent.businessDomains',
  'talent.problemCategories',
  'talent.taskTypes',
  'talent.technologies',
  'talent.trustScore',
  'talent.completedTasks',
  'talent.updatedAt',
  'talent.availableFrom',
]

test.group('Talent Search discovery filter context', () => {
  test('exposes the public anonymous capability matrix and semantic multi-label fields', async ({
    assert,
  }) => {
    const definition = await new TalentDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TALENT_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' },
    })

    assert.equal(definition.key, TALENT_DISCOVERY_CONTEXTS.public)
    assert.equal(definition.version, 1)
    assert.equal(definition.resource, 'talent')
    assert.equal(definition.ownerModule, 'search')
    assert.equal(definition.executionProfile, TALENT_DISCOVERY_EXECUTION_PROFILE)
    assert.equal(definition.degradationPolicy, 'fail_closed')
    assert.deepEqual(definition.capabilities, {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: false,
      relativeTime: true,
      savedViews: false,
      sharedViews: false,
      alerts: false,
      emptyRequest: true,
      pagination: 'cursor',
      maxDepth: 5,
      maxConditions: 48,
    })
    assert.deepEqual(
      definition.fields.map(({ key }) => key),
      EXPECTED_FIELDS
    )

    for (const field of definition.fields.filter(({ type }) => type === 'multi_value')) {
      assert.include(field.operators, 'contains_any')
      assert.include(field.operators, 'contains_all')
      assert.include(field.operators, 'contains_none')
      assert.include(field.operators, 'contains_at_least')
      assert.include(field.operators, 'is_empty')
      assert.isTrue(field.facetable)
      assert.deepEqual(field.facetCountModes, ['constrained', 'self_excluding'])
    }

    assert.deepEqual(definition.defaultSort, [{ field: 'talent.trustScore', direction: 'desc' }])
    assert.deepEqual(definition.sorts, [
      { field: 'talent.trustScore', directions: ['asc', 'desc'] },
      { field: 'talent.completedTasks', directions: ['asc', 'desc'] },
    ])
  })

  test('rejects authenticated and organization principals instead of widening public discovery', async ({
    assert,
  }) => {
    const provider = new TalentDiscoveryFilterContextProvider()
    const inputs = [
      {
        context: TALENT_DISCOVERY_CONTEXTS.public,
        principal: { kind: 'user' as const, id: 'user-1' },
      },
      {
        context: TALENT_DISCOVERY_CONTEXTS.public,
        principal: { kind: 'user' as const, id: 'user-1', organizationId: 'org-1' },
      },
      {
        context: 'talents.discovery.organization',
        principal: { kind: 'anonymous' as const },
      },
    ]

    for (const input of inputs) {
      try {
        await provider.getEffectiveDefinition(input)
        assert.fail('Expected Talent discovery context resolution to reject')
      } catch (error) {
        assert.instanceOf(error, FilterContextResolutionError)
      }
    }
  })

  test('exposes the organization recruiter context only for a resolved organization role', async ({
    assert,
  }) => {
    const definition = await new TalentDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TALENT_DISCOVERY_CONTEXTS.organization,
      principal: {
        kind: 'user',
        id: 'user-1',
        organizationId: 'org-1',
        organizationRole: 'org_admin',
      },
    })

    assert.equal(definition.key, TALENT_DISCOVERY_CONTEXTS.organization)
    assert.equal(definition.resource, 'talent')
    assert.equal(definition.executionProfile, TALENT_DISCOVERY_EXECUTION_PROFILE)
    assert.equal(definition.capabilities.pagination, 'cursor')
    assert.deepEqual(
      definition.fields.map(({ key }) => key),
      EXPECTED_FIELDS
    )
  })

  test('rejects the organization context without tenant-bound identity and role', async ({
    assert,
  }) => {
    const provider = new TalentDiscoveryFilterContextProvider()
    const inputs = [
      { context: TALENT_DISCOVERY_CONTEXTS.organization, principal: { kind: 'anonymous' as const } },
      {
        context: TALENT_DISCOVERY_CONTEXTS.organization,
        principal: { kind: 'user' as const, id: 'user-1', organizationId: 'org-1' },
      },
      {
        context: TALENT_DISCOVERY_CONTEXTS.organization,
        principal: {
          kind: 'user' as const,
          id: 'user-1',
          organizationId: 'org-1',
          organizationRole: 'org_member',
        },
      },
      {
        context: TALENT_DISCOVERY_CONTEXTS.organization,
        principal: {
          kind: 'user' as const,
          id: 'user-1',
          organizationId: 'org-1',
          organizationRole: 'unknown',
        },
      },
    ]

    for (const input of inputs) {
      try {
        await provider.getEffectiveDefinition(input)
        assert.fail('Expected organization Talent context resolution to reject')
      } catch (error) {
        assert.instanceOf(error, FilterContextResolutionError)
      }
    }
  })
})
