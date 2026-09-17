import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { SEARCH_BLENDED_CONTEXT } from '#modules/search/public_contracts/search_discovery_contract'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

const criteria = {
  context: SEARCH_BLENDED_CONTEXT,
  schemaVersion: 1,
  text: { value: 'incident response' },
  sort: [],
  page: { size: 25 },
}

test.group('Contract | Search blended saved views HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.each.teardown(async () => cleanupTestData())
  group.teardown(async () => teardownApp())

  test('lets an authenticated user create and list a private Search saved view', async ({
    client,
    assert,
  }) => {
    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: organization.id }).save()

    const created = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(owner)
      .json({
        name: 'Search incident response',
        contextKey: SEARCH_BLENDED_CONTEXT,
        contextOwner: 'search',
        criteria,
        presentation: { view: 'search' },
      })
    created.assertStatus(201)
    const persisted = await db
      .from('filter_saved_views')
      .where('context_key', SEARCH_BLENDED_CONTEXT)
    assert.lengthOf(persisted, 1)
    const listed = await client
      .get('/api/v1/filter-saved-views')
      .loginAs(owner)
      .qs({ context: SEARCH_BLENDED_CONTEXT })
    listed.assertStatus(200)
    assert.equal((listed.body() as { views: unknown[] }).views.length, 1)
  })

  test('denies anonymous access and unsupported alert and context paths', async ({
    client,
    assert,
  }) => {
    const anonymous = await client
      .get('/api/v1/filter-saved-views')
      .qs({ context: SEARCH_BLENDED_CONTEXT })
    anonymous.assertStatus(401)

    const owner = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: owner.id })
    await OrganizationUserFactory.create({
      organization_id: organization.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: organization.id }).save()
    const created = await client.post('/api/v1/filter-saved-views').loginAs(owner).json({
      name: 'Private Search view',
      contextKey: SEARCH_BLENDED_CONTEXT,
      contextOwner: 'search',
      criteria,
      presentation: {},
    })
    created.assertStatus(201)
    const view = (created.body() as { view: { id: string; lockVersion: number } }).view

    const sharing = await client
      .post(`/api/v1/filter-saved-views/${view.id}/share`)
      .loginAs(owner)
      .json({
        expectedLockVersion: view.lockVersion,
        visibility: 'organization',
        organizationId: organization.id,
        teamId: null,
        grants: [
          {
            target: { type: 'organization', id: organization.id },
            read: true,
            edit: false,
            share: false,
            subscribe: false,
          },
        ],
      })
    sharing.assertStatus(200)

    const alert = await client
      .post(`/api/v1/filter-saved-views/${view.id}/alert`)
      .loginAs(owner)
      .json({ intervalMinutes: 30, timezone: 'UTC' })
    alert.assertStatus(401)
    assert.equal((alert.body() as { code: string }).code, 'SAVED_FILTER_VIEW_UNAVAILABLE')

    const unsupportedContext = await client
      .post('/api/v1/filter-saved-views')
      .loginAs(owner)
      .json({
        name: 'Unsupported Search view',
        contextKey: 'search.blended.other',
        contextOwner: 'search',
        criteria: { ...criteria, context: 'search.blended.other' },
        presentation: {},
      })
    unsupportedContext.assertStatus(401)
    assert.equal(
      (unsupportedContext.body() as { code: string }).code,
      'SAVED_FILTER_VIEW_UNAVAILABLE'
    )
  })
})
