import { test } from '@japa/runner'

import type {
  UserDirectorySearchDocumentReader,
  UserDirectorySearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/user_directory_search_document_reader'
import { UserDirectorySearchDocumentBuilder } from '#modules/search/infra/users/user_directory_search_document_builder'

test.group('Unit | User Directory Search Document Builder', () => {
  test('maps user directory search record from domain reader into search document', async ({
    assert,
  }) => {
    const builder = new UserDirectorySearchDocumentBuilder({
      findUserDirectorySearchDocumentRecord: (userId: string) => {
        assert.equal(userId, 'user-1')

        return Promise.resolve({
          userId,
          username: 'elastic_member',
          email: 'elastic.member@example.com',
          status: 'active',
          deletedAt: '2026-07-04T00:00:00.000Z',
          updatedAt: '2026-07-04T01:00:00.000Z',
        } satisfies UserDirectorySearchDocumentRecord)
      },
    } satisfies UserDirectorySearchDocumentReader)

    const document = await builder.build('user-1')

    assert.deepEqual(document, {
      user_id: 'user-1',
      username: 'elastic_member',
      email: 'elastic.member@example.com',
      status: 'active',
      deleted_at: '2026-07-04T00:00:00.000Z',
      updated_at: '2026-07-04T01:00:00.000Z',
    })
  })
})
