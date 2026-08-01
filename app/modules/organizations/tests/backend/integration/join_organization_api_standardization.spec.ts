import { test } from '@japa/runner'

import OrganizationUser from '#modules/organizations/members/infra/models/organization_user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Join organization API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('join organization JSON path returns wrapped payload and persists pending membership', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner({ name: 'Joinable Org' })
    const user = await UserFactory.create()

    const response = await client
      .post(`/organizations/${org.id}/join`)
      .loginAs(user)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        organization: { id: string; name: string }
        joinRequest: { status: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organization.id, org.id)
    assert.equal(body.data.organization.name, 'Joinable Org')
    assert.equal(body.data.joinRequest.status, 'pending')

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', user.id)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership?.status, 'pending')
  })
})
