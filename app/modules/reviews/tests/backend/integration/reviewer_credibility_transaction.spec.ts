import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeUpdateReviewerCredibilityCommand } from '#composition/reviews/review-core/review_action_factory'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Reviewer credibility transaction', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('standalone handle owns and commits its transaction', async ({ assert }) => {
    const reviewer = await UserFactory.create()
    const command = makeUpdateReviewerCredibilityCommand(
      makeSystemReviewActionContext(reviewer.id)
    )

    const result = await command.handle({ user_id: reviewer.id })
    const persisted = await User.findOrFail(reviewer.id)

    assert.deepEqual(result, {
      credibility_score: 50,
      total_reviews: 0,
    })
    assert.equal(persisted.credibility_data?.credibility_score, 50)
    assert.equal(persisted.credibility_data?.total_reviews_given, 0)
  })

  test('an abort during execution rejects and rolls back the caller transaction', async ({
    assert,
  }) => {
    const reviewer = await UserFactory.create({
      credibility_data: {
        credibility_score: 77,
        total_reviews_given: 4,
        accurate_reviews: 3,
        disputed_reviews: 1,
        last_calculated_at: null,
      },
    })
    const command = makeUpdateReviewerCredibilityCommand(
      makeSystemReviewActionContext(reviewer.id)
    )
    const controller = new AbortController()

    const execution = db.transaction(async (trx) => {
      queueMicrotask(() => controller.abort())
      return command.handleInTransaction(
        { user_id: reviewer.id },
        trx,
        { signal: controller.signal }
      )
    })

    await assert.rejects(() => execution, /abort/i)

    const persisted = await User.findOrFail(reviewer.id)
    assert.equal(persisted.credibility_data?.credibility_score, 77)
    assert.equal(persisted.credibility_data?.total_reviews_given, 4)
    assert.equal(persisted.credibility_data?.accurate_reviews, 3)
    assert.equal(persisted.credibility_data?.disputed_reviews, 1)
  })
})
