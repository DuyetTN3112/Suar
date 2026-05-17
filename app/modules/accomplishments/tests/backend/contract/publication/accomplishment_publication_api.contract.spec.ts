import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

/**
 * WP-28 contract: public accomplishment publication must be a real authenticated
 * application boundary, not a test-only repository call.
 */
test.group('Contract | Accomplishment publication HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(async () => {
    await teardownApp()
  })

  test('refuses anonymous publication requests', async ({ client }) => {
    const response = await client
      .post('/api/v1/accomplishments/00000000-0000-4000-8000-000000000001/publication')
      .json({
        idempotencyKey: 'contract-anonymous',
        expectedSourceCanonicalHash: `sha256:${'a'.repeat(64)}`,
        expectedLifecycleRevisionId: '00000000-0000-4000-8000-000000000002',
        expectedDisclosureDecisionHash: `sha256:${'b'.repeat(64)}`,
        expectedDisclosurePolicyVersion: 'policy.v1',
        consentFactId: '00000000-0000-4000-8000-000000000003',
        consentFactHash: `sha256:${'c'.repeat(64)}`,
      })

    response.assertStatus(401)
  })

  test('refuses anonymous unpublication requests', async ({ client }) => {
    const response = await client
      .delete('/api/v1/accomplishments/00000000-0000-4000-8000-000000000001/publication')
      .json({
        projectionId: '00000000-0000-4000-8000-000000000002',
        publicationVersion: 1,
        confirmed: true,
      })

    response.assertStatus(401)
  })
})
