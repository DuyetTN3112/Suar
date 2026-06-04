import { test } from '@japa/runner'

import { ADMIN_AUDIT_FILTER_CONTEXT } from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_filter_context_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

/**
 * WP-14 contract: one authorized Filter HTTP boundary.
 *
 * These cases prove the transport, not the semantic kernel: effective-definition
 * discovery is permission scoped, criteria execution runs through the registry,
 * and no client may smuggle a principal or a provider DSL.
 */
test.group('Contract | Filter HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('refuses to expose a privileged context definition to an anonymous caller', async ({
    client,
  }) => {
    const response = await client.get(
      `/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`
    )

    response.assertStatus(401)
  })

  test('an unknown context is indistinguishable from an unauthorized one', async ({
    client,
    assert,
  }) => {
    const unknown = await client.get('/api/v1/filter/contexts/does.not.exist.v1')
    const known = await client.get(
      `/api/v1/filter/contexts/${encodeURIComponent(ADMIN_AUDIT_FILTER_CONTEXT)}`
    )

    assert.equal(
      unknown.status(),
      known.status(),
      'context discovery must not become an enumeration side channel'
    )
  })

  test('never accepts a principal supplied by the client', async ({ client }) => {
    const response = await client.post('/api/v1/filter/query').json({
      criteria: {
        context: ADMIN_AUDIT_FILTER_CONTEXT,
        schemaVersion: 1,
        sort: [],
        page: { size: 10 },
      },
      principal: { kind: 'user', id: 'forged-admin', organizationRole: 'system_admin' },
    })

    response.assertStatus(401)
  })

  test('rejects a criteria payload carrying raw provider DSL', async ({ client }) => {
    const response = await client.post('/api/v1/filter/query').json({
      criteria: {
        context: ADMIN_AUDIT_FILTER_CONTEXT,
        schemaVersion: 1,
        sort: [],
        page: { size: 10 },
        query: { bool: { must: [{ match_all: {} }] } },
      },
    })

    response.assertStatus(401)
  })
})
