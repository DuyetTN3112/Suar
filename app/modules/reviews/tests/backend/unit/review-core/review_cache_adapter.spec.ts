import { test } from '@japa/runner'

import { createReviewCachePort } from '#modules/reviews/infra/adapters/review-core/review_cache_adapter'

function createCacheSpy() {
  const deletedKeys: string[] = []
  const deletedPatterns: string[] = []

  return {
    deletedKeys,
    deletedPatterns,
    store: {
      delete(key: string) {
        deletedKeys.push(key)
        return Promise.resolve()
      },
      deleteByPattern(pattern: string) {
        deletedPatterns.push(pattern)
        return Promise.resolve()
      },
    },
  }
}

test.group('Review cache adapter', () => {
  test('invalidates the canonical review session and pending-review namespaces', async ({
    assert,
  }) => {
    const spy = createCacheSpy()
    const port = createReviewCachePort(spy.store)

    await port.invalidateReview('session-1')
    await port.invalidatePendingReviews('reviewer-1')

    assert.deepEqual(spy.deletedKeys, ['review:session:v4:sessionId:session-1'])
    assert.deepEqual(spy.deletedPatterns, ['user:pending_reviews:*:userId:reviewer-1'])
  })

  test('invalidates canonical review aggregates for a user', async ({ assert }) => {
    const spy = createCacheSpy()
    const port = createReviewCachePort(spy.store)

    await port.invalidateUserReviewData('user-1')

    assert.deepEqual(spy.deletedKeys, ['users:spider_chart:v4:user-1'])
    assert.isEmpty(spy.deletedPatterns)
  })

  test('invalidates every profile projection affected by confirmed review scores', async ({
    assert,
  }) => {
    const spy = createCacheSpy()
    const port = createReviewCachePort(spy.store)

    await port.invalidateUserProfileReviewData('user-1')

    assert.sameMembers(spy.deletedKeys, [
      'users:spider_chart:v4:user-1',
      'users:delivery_metrics:user-1',
    ])
    assert.deepEqual(spy.deletedPatterns, ['users:featured_reviews:v2:user-1:*'])
  })
})
