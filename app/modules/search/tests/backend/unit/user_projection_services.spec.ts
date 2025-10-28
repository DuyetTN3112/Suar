import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { TalentSearchProjectionService } from '#modules/search/actions/services/talent_search_projection_service'
import { UserDirectorySearchProjectionService } from '#modules/search/actions/services/user_directory_search_projection_service'
import type { UserSearchSyncReader } from '#modules/users/application/ports/user_search_sync_reader'

test.group('Unit | User Search Projection Services', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('talent reindexAll consumes active user ids from user search sync reader', async ({
    assert,
  }) => {
    const calls: string[] = []
    const rawTalentRepository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      bulkUpsertDocuments: (documents: Array<{ user_id: string }>) => {
        calls.push(`repo:bulk:${documents.map((document) => document.user_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const talentRepository = rawTalentRepository as unknown as ConstructorParameters<
      typeof TalentSearchProjectionService
    >[0]
    const rawTalentBuilder = {
      build: (userId: string) => {
        calls.push(`builder:${userId}`)
        return Promise.resolve({
          user_id: userId,
          status: 'active',
          is_searchable: userId !== 'skip-user',
        })
      },
    }
    const talentBuilder = rawTalentBuilder as unknown as ConstructorParameters<
      typeof TalentSearchProjectionService
    >[1]

    const service = new TalentSearchProjectionService(
      talentRepository,
      talentBuilder,
      {
        listActiveUserIds: () => {
          calls.push('reader:active')
          return Promise.resolve(['user-1', 'skip-user', 'user-2'])
        },
        listNotDeletedUserIds: () => Promise.resolve([]),
      } satisfies UserSearchSyncReader
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'repo:reset',
      'repo:ensure',
      'reader:active',
      'builder:user-1',
      'builder:skip-user',
      'builder:user-2',
      'repo:bulk:user-1,user-2',
    ])
  })

  test('user-directory reindexAll consumes non-deleted user ids from user search sync reader', async ({
    assert,
  }) => {
    const calls: string[] = []
    const rawDirectoryRepository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      bulkUpsertDocuments: (documents: Array<{ user_id: string }>) => {
        calls.push(`repo:bulk:${documents.map((document) => document.user_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const directoryRepository = rawDirectoryRepository as unknown as ConstructorParameters<
      typeof UserDirectorySearchProjectionService
    >[0]
    const rawDirectoryBuilder = {
      build: (userId: string) => {
        calls.push(`builder:${userId}`)
        return Promise.resolve({
          user_id: userId,
          deleted_at: userId === 'deleted-user' ? '2026-01-01T00:00:00.000Z' : null,
        })
      },
    }
    const directoryBuilder = rawDirectoryBuilder as unknown as ConstructorParameters<
      typeof UserDirectorySearchProjectionService
    >[1]

    const service = new UserDirectorySearchProjectionService(
      directoryRepository,
      directoryBuilder,
      {
        listActiveUserIds: () => Promise.resolve([]),
        listNotDeletedUserIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['user-1', 'deleted-user', 'user-2'])
        },
      } satisfies UserSearchSyncReader
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'repo:reset',
      'repo:ensure',
      'reader:notDeleted',
      'builder:user-1',
      'builder:deleted-user',
      'builder:user-2',
      'repo:bulk:user-1,user-2',
    ])
  })
})
