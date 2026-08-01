import { test } from '@japa/runner'

import { SearchUsersViaEngineQuery } from '#modules/search/actions/queries/search_users_via_engine_query'
import { LucidUserDirectorySearchDocumentReader } from '#modules/users/infra/adapters/lucid_user_directory_search_document_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | User Directory Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('retrieves active users by indexed username or email keyword', async ({ assert }) => {
    const matchingUser = await UserFactory.create({
      username: 'elastic_member',
      email: 'elastic.member@example.com',
      status: 'active',
    })

    const [
      { UserDirectorySearchDocumentBuilder },
      { UserDirectorySearchIndexRepository },
      { searchClient },
    ] = await Promise.all([
      import('#modules/search/infra/users/user_directory_search_document_builder'),
      import('#modules/search/infra/users/user_directory_search_index_repository'),
      import('#platform/search/elasticsearch_client'),
    ])

    const repository = new UserDirectorySearchIndexRepository()
    const builder = new UserDirectorySearchDocumentBuilder(
      new LucidUserDirectorySearchDocumentReader()
    )

    await repository.resetIndex()
    await repository.ensureIndex()
    const searchDocument = await builder.build(matchingUser.id)
    if (!searchDocument) {
      throw new Error('Expected user directory search document')
    }
    await repository.upsertDocument(searchDocument)
    await searchClient.indices.refresh({ index: repository.indexName })

    const result = await new SearchUsersViaEngineQuery(repository).handle({
      q: 'elastic member',
      limit: 5,
    })

    assert.deepEqual(
      result.map((item) => item.userId),
      [matchingUser.id]
    )
  }).timeout(10000)

  test('does not return deleted users even when keyword matches', async ({ assert }) => {
    const deletedUser = await UserFactory.create({
      username: 'elastic_deleted_member',
      email: 'elastic.deleted@example.com',
      status: 'inactive',
    })

    await deletedUser
      .merge({
        deleted_at: deletedUser.updated_at,
      })
      .save()

    const [
      { UserDirectorySearchDocumentBuilder },
      { UserDirectorySearchIndexRepository },
      { searchClient },
    ] = await Promise.all([
      import('#modules/search/infra/users/user_directory_search_document_builder'),
      import('#modules/search/infra/users/user_directory_search_index_repository'),
      import('#platform/search/elasticsearch_client'),
    ])

    const repository = new UserDirectorySearchIndexRepository()
    const builder = new UserDirectorySearchDocumentBuilder(
      new LucidUserDirectorySearchDocumentReader()
    )

    await repository.resetIndex()
    await repository.ensureIndex()
    const deletedDocument = await builder.build(deletedUser.id)
    if (!deletedDocument) {
      throw new Error('Expected soft-deleted user directory document')
    }
    await repository.upsertDocument(deletedDocument)
    await searchClient.indices.refresh({ index: repository.indexName })

    const result = await new SearchUsersViaEngineQuery(repository).handle({
      q: 'elastic',
      limit: 5,
    })

    assert.deepEqual(result, [])
  }).timeout(10000)
})
