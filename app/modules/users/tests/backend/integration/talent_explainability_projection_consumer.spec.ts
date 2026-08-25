import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Talent Explainability Projection Consumer', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('applies a full replacement idempotently and rejects an older revision', async ({
    assert,
  }) => {
    const user = await UserFactory.create()

    const applied = await userPublicApi.applyTalentExplainabilityProjectionV1(user.id, {
      contract_version: 1,
      under_dispute_skills_count: 2,
      latest_confidence_signal: 'high',
      source_revision: '200',
      projected_at: '2026-07-26T02:00:01.000Z',
    })
    const staleApplied = await userPublicApi.applyTalentExplainabilityProjectionV1(user.id, {
      contract_version: 1,
      under_dispute_skills_count: 9,
      latest_confidence_signal: 'low',
      source_revision: '100',
      projected_at: '2026-07-26T03:00:00.000Z',
    })

    assert.isTrue(applied)
    assert.isFalse(staleApplied)

    const summaries = await userPublicApi.getTalentExplainabilitySummaryByUserId([user.id])
    assert.deepInclude(summaries.get(user.id), {
      underDisputeSkillsCount: 2,
      latestConfidenceSignal: 'high',
    })

    const row = (await db
      .from('users')
      .where('id', user.id)
      .select('trust_data')
      .first()) as { trust_data: Record<string, unknown> } | null
    assert.equal(
      (
        row?.trust_data['talent_explainability_v1'] as
          | { source_revision?: string }
          | undefined
      )?.source_revision,
      '200'
    )
  })

  test('rejects malformed revisions without changing user state', async ({ assert }) => {
    const user = await UserFactory.create()

    const applied = await userPublicApi.applyTalentExplainabilityProjectionV1(user.id, {
      contract_version: 1,
      under_dispute_skills_count: 1,
      latest_confidence_signal: null,
      source_revision: 'not-a-revision',
      projected_at: '2026-07-26T02:00:01.000Z',
    })

    assert.isFalse(applied)
    const summaries = await userPublicApi.getTalentExplainabilitySummaryByUserId([user.id])
    assert.deepInclude(summaries.get(user.id), {
      underDisputeSkillsCount: 0,
      latestConfidenceSignal: null,
    })
  })
})
