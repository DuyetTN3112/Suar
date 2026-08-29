import { test } from '@japa/runner'

import { ADMIN_AUDIT_FILTER_CONTEXT } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Filter/Search route registration', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.each.teardown(async () => {
    await cleanupTestData()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('routes privileged Filter context discovery through auth and real composition', async ({
    client,
    assert,
  }) => {
    const anonymous = await client.get(
      `/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`
    )
    anonymous.assertStatus(401)

    const admin = await UserFactory.createSuperadmin()
    const authorized = await client
      .get(`/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`)
      .loginAs(admin)

    authorized.assertStatus(200)
    const body = authorized.body() as {
      definition: { key: string; executionProfile: string }
    }
    assert.equal(body.definition.key, ADMIN_AUDIT_FILTER_CONTEXT)
    assert.equal(body.definition.executionProfile, 'postgres.audit.admin.investigation.v1')
  })

  test('routes saved-view listing through the canonical admin context and denies anonymous access', async ({
    client,
  }) => {
    const anonymous = await client
      .get('/api/v1/filter-saved-views')
      .qs({ context: ADMIN_AUDIT_FILTER_CONTEXT })
    anonymous.assertStatus(401)

    const admin = await UserFactory.createSuperadmin()
    const authorized = await client
      .get('/api/v1/filter-saved-views')
      .qs({ context: ADMIN_AUDIT_FILTER_CONTEXT })
      .loginAs(admin)

    authorized.assertStatus(200)
  })

  test('routes Filter query through the registered PostgreSQL executor for an admin', async ({
    client,
    assert,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const response = await client
      .post('/api/v1/filter/query')
      .loginAs(admin)
      .json({
        criteria: {
          context: ADMIN_AUDIT_FILTER_CONTEXT,
          schemaVersion: 1,
          sort: [],
          page: { size: 5 },
        },
      })

    response.assertStatus(200)
    const body = response.body() as { execution: { provider: string } }
    assert.equal(body.execution.provider, 'postgres.audit.admin.investigation.v1')
  })

  test('routes malformed Search Discovery input to the controller boundary', async ({ client }) => {
    const response = await client.post('/api/v1/search/discovery').json({})

    response.assertStatus(422)
  })
})
