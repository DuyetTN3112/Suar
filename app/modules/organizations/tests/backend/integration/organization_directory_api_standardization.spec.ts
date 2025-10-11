import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Organization directory API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('canonical v1 organizations list preserves legacy wrapped payload contract', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create()
    await OrganizationFactory.create({ name: 'Alpha Directory Org' })
    await OrganizationFactory.create({ name: 'Beta Directory Org' })

    const legacyResponse = await client.get('/api/organizations').loginAs(user)
    const canonicalResponse = await client.get('/api/v1/organizations').loginAs(user)

    legacyResponse.assertStatus(200)
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: Array<{ id: string; name: string; description?: string | null }>
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.notProperty(legacyBody, 'success')
    assert.deepEqual(canonicalBody, legacyBody)
    assert.isAtLeast(canonicalBody.data.length, 2)
    assert.includeMembers(
      canonicalBody.data.map((organization) => organization.name),
      ['Alpha Directory Org', 'Beta Directory Org']
    )
  })
})
