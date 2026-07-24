import { test } from '@japa/runner'

import { FilterContextResolutionError } from '#modules/filtering/public_contracts/filter_context_provider'
import {
  TALENT_DISCOVERY_CONTEXTS,
  TalentDiscoveryFilterContextProvider,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_filter_context'
import { TalentDiscoveryPermissionProvider } from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_permission_provider'

test.group('Talent Search discovery permission provider', () => {
  test('requires active and searchable talent documents with fail-closed unknown handling', async ({
    assert,
  }) => {
    const result = await new TalentDiscoveryPermissionProvider().buildMandatoryExpression({
      context: TALENT_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' },
    })

    assert.deepEqual(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'permission.talent.active',
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: 'permission.talent.searchable',
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
      ],
    })
    assert.deepEqual(result.fieldBindings, [
      {
        field: 'permission.talent.active',
        type: 'boolean',
        operators: ['is_true'],
        effects: ['require'],
      },
      {
        field: 'permission.talent.searchable',
        type: 'boolean',
        operators: ['is_true'],
        effects: ['require'],
      },
    ])
    assert.equal(result.authorizationVersion, 'talent-public-anonymous:v1')
  })

  test('rejects authenticated and organization contexts without returning a weaker constraint', async ({
    assert,
  }) => {
    const provider = new TalentDiscoveryPermissionProvider()
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
        await provider.buildMandatoryExpression(input)
        assert.fail('Expected Talent discovery permission resolution to reject')
      } catch (error) {
        assert.instanceOf(error, FilterContextResolutionError)
      }
    }
  })

  test('does not expose permission fields as selectable context fields', async ({ assert }) => {
    const definition = await new TalentDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TALENT_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' },
    })
    const visibleFields = new Set(definition.fields.map(({ key }) => key))

    assert.isFalse(visibleFields.has('permission.talent.active'))
    assert.isFalse(visibleFields.has('permission.talent.searchable'))
  })

  test('keeps the same public evidence boundary for an organization recruiter context', async ({
    assert,
  }) => {
    const result = await new TalentDiscoveryPermissionProvider().buildMandatoryExpression({
      context: TALENT_DISCOVERY_CONTEXTS.organization,
      principal: {
        kind: 'user',
        id: 'user-1',
        organizationId: 'org-1',
        organizationRole: 'org_admin',
      },
    })

    assert.deepEqual(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'permission.talent.active',
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
        {
          kind: 'condition',
          field: 'permission.talent.searchable',
          operator: 'is_true',
          effect: 'require',
          unknown: 'exclude',
        },
      ],
    })
    assert.equal(result.authorizationVersion, 'talent-organization-admin:v1')
  })

  test('rejects organization permission resolution without a tenant-bound role', async ({
    assert,
  }) => {
    const provider = new TalentDiscoveryPermissionProvider()
    const inputs = [
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
        principal: { kind: 'user' as const, id: 'user-1', organizationRole: 'org_member' },
      },
    ]

    for (const input of inputs) {
      try {
        await provider.buildMandatoryExpression(input)
        assert.fail('Expected organization Talent permission resolution to reject')
      } catch (error) {
        assert.instanceOf(error, FilterContextResolutionError)
      }
    }
  })
})
