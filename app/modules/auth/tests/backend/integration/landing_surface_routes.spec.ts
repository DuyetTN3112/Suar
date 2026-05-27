import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

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

  test('organization owner opening legacy projects index is redirected to org portfolio', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.get('/projects').redirects(0).loginAs(owner)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/org/projects')
  })

  test('organization member opening user dashboard is rendered without redirecting to itself', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/dashboard').redirects(0).loginAs(member)

    response.assertStatus(200)
    assert.notEqual(response.header('location'), '/dashboard')
  })
})
