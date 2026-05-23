import { test } from '@japa/runner'

import { filterContextProvider, filteringActionFactory } from '#composition/filtering/filter-runtime/filtering_composition'

test.group('Unit | Filtering composition context dispatch', () => {
  test('exposes task member alerts capability through the real composition provider', async ({ assert }) => {
    const definition = await filterContextProvider.getEffectiveDefinition({
      context: 'tasks.discovery.member',
      principal: { kind: 'user', id: 'user-1', organizationId: 'org-1', organizationRole: 'org_member' },
    })
    assert.equal(definition.ownerModule, 'tasks')
    assert.isTrue(definition.capabilities.alerts)
    assert.equal(definition.executionProfile, 'search.tasks.discovery.v1')
  })

  test('binds taxonomy consumer coordination through the application factory', ({ assert }) => {
    assert.equal(typeof filteringActionFactory.coordinateTaxonomyFilterConsumers.handle, 'function')
  })
})
