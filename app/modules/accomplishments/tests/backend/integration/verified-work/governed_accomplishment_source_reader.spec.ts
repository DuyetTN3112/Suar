import { test } from '@japa/runner'

import LucidGovernedAccomplishmentProjectionSourceReader from '#modules/accomplishments/infra/adapters/verified-work/lucid_governed_accomplishment_projection_source_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Governed accomplishment source reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(async () => {
    await teardownApp()
  })

  test('fails closed when the review workflow or finalized fact is absent', async ({ assert }) => {
    const result = await new LucidGovernedAccomplishmentProjectionSourceReader().load({
      reviewWorkflowId: '00000000-0000-4000-8000-000000000001',
      completionClaimId: '00000000-0000-4000-8000-000000000002',
      reviewFinalizedFactId: '00000000-0000-4000-8000-000000000003',
      reviewFinalizedFactHash: `sha256:${'a'.repeat(64)}`,
      projectionPolicyVersion: 'accomplishment-policy-v1',
    })
    assert.isNull(result)
  })
})
