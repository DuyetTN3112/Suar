import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

test.group('Integration | Auth Landing Surface Routes', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('organization owner opening legacy user dashboard is redirected to org dashboard', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.get('/dashboard').redirects(0).loginAs(owner)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/org')
  })
})
