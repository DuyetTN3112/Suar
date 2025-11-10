import { test } from '@japa/runner'

import { buildSearchQueryPrivacyFields } from '#modules/search/observability/search_query_privacy'

test.group('Unit | Search Query Privacy', () => {
  test('normalizes query and derives stable hash metadata', ({ assert }) => {
    const result = buildSearchQueryPrivacyFields('  Elastic   Search  ')

    assert.equal(result.normalizedQuery, 'elastic search')
    assert.equal(result.queryTextLength, 14)
    assert.lengthOf(result.queryHash, 64)
  })
})
