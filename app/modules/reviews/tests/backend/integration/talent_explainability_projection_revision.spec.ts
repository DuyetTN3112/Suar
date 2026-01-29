import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/list_talent_explainability_projections_v1_query'
import { LucidTalentExplainabilityFactSourceReader } from '#modules/reviews/infra/adapters/lucid_review_fact_source_readers'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Talent explainability projection revision', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('serializes same-user publishers and allocates monotonic revisions', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const firstTrx = await db.transaction()
    const secondTrx = await db.transaction()
    try {
      const first = await new ListTalentExplainabilityProjectionsV1Query(
        new LucidTalentExplainabilityFactSourceReader()
      ).execute([user.id], firstTrx)
      let secondSettled = false
      const secondPromise = new ListTalentExplainabilityProjectionsV1Query(
        new LucidTalentExplainabilityFactSourceReader()
      )
        .execute([user.id], secondTrx)
        .then((result) => {
          secondSettled = true
          return result
        })
      await new Promise((resolve) => setTimeout(resolve, 20))
      assert.isFalse(secondSettled)

      await firstTrx.commit()
      const second = await secondPromise
      await secondTrx.commit()

      const firstRevision = BigInt(first[0]?.sourceRevision ?? '0')
      const secondRevision = BigInt(second[0]?.sourceRevision ?? '0')
      assert.isAbove(Number(firstRevision), 0)
      assert.isTrue(secondRevision > firstRevision)
    } catch (error) {
      if (!firstTrx.isCompleted) await firstTrx.rollback()
      if (!secondTrx.isCompleted) await secondTrx.rollback()
      throw error
    }
  })
})
