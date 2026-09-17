import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { UserDirectorySearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'
import { SearchUsersViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_users_via_engine_query'

const buildRepository = (search: UserDirectorySearchStore['search']): UserDirectorySearchStore => ({
  indexName: 'search-engine-test',
  upsertDocument: () => Promise.resolve(),
  upsertDocumentFenced: () => Promise.resolve(),
  replaceAllDocuments: () => Promise.resolve(),
  deleteDocument: () => Promise.resolve(),
  deleteDocumentFenced: () => Promise.resolve(),
  search,
})

test.group('Search engine query Result boundaries', () => {
  test('wraps expected application exceptions and preserves unexpected failures', async ({ assert }) => {
    const failure = new ForbiddenException('Search access denied')
    const query = new SearchUsersViaEngineQuery(buildRepository(() => Promise.reject(failure)))

    const result = await query.executeAndWrap({ q: 'alice', limit: 10 })

    assert.isFalse(result.isSuccess())
    assert.strictEqual(result.getError(), failure)

    const unexpected = new Error('search engine unavailable')
    const brokenQuery = new SearchUsersViaEngineQuery(buildRepository(() => Promise.reject(unexpected)))

    await assert.rejects(
      () => brokenQuery.executeAndWrap({ q: 'alice', limit: 10 }),
      /search engine unavailable/
    )
  })
})
