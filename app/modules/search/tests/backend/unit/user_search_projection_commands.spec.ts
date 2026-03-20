import { test } from '@japa/runner'

import { TalentSearchProjectionCommands } from '#modules/search/actions/commands/projections/talent_search_projection_commands'
import { UserDirectorySearchProjectionCommands } from '#modules/search/actions/commands/projections/user_directory_search_projection_commands'
import type { UserSearchSyncReader } from '#modules/search/actions/ports/outbound/user_search_sync_reader'

test.group('Unit | User Search Projection Commands', () => {
  test('fenced lifecycle projection tombstones a missing user in both indexes', async ({
    assert,
  }) => {
    const context = {
      signal: new AbortController().signal,
      externalVersion: 101,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    }
    const directoryDeletes: unknown[] = []
    const talentDeletes: unknown[] = []
    const directoryRepository = {
      deleteDocumentFenced: (_userId: string, writeContext: unknown) => {
        directoryDeletes.push(writeContext)
        return Promise.resolve()
      },
    } as unknown as ConstructorParameters<typeof UserDirectorySearchProjectionCommands>[0]
    const talentRepository = {
      deleteDocumentFenced: (_userId: string, writeContext: unknown) => {
        talentDeletes.push(writeContext)
        return Promise.resolve()
      },
    } as unknown as ConstructorParameters<typeof TalentSearchProjectionCommands>[0]
    const builder = {
      build: () => Promise.resolve(null),
    }
    const syncReader = {
      listActiveUserIds: () => Promise.resolve([]),
      listNotDeletedUserIds: () => Promise.resolve([]),
    }

    await new UserDirectorySearchProjectionCommands(
      directoryRepository,
      builder,
      syncReader,
      { isEnabled: () => true }
    ).reindexDocumentFenced('user-1', context)
    await new TalentSearchProjectionCommands(talentRepository, builder, syncReader, {
      isEnabled: () => true,
    }).reindexDocumentFenced('user-1', context)

    assert.deepEqual(directoryDeletes, [context])
    assert.deepEqual(talentDeletes, [context])
  })

  test('talent reindex propagates abort into an active index write', async ({ assert }) => {
    const controller = new AbortController()
    let observedSignal: AbortSignal | undefined
    let writeCompleted = false
    let markWriteStarted: (() => void) | undefined
    const writeStarted = new Promise<void>((resolve) => {
      markWriteStarted = resolve
    })
    const rawTalentRepository = {
      ensureIndex: () => Promise.resolve(),
      resetIndex: () => Promise.resolve(),
      bulkUpsertDocuments: () => Promise.resolve(),
      deleteDocument: () => Promise.resolve(),
      upsertDocument: (_document: unknown, signal?: AbortSignal) => {
        observedSignal = signal
        markWriteStarted?.()
        return new Promise<void>((resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(signal.reason)
            },
            { once: true }
          )
          if (!signal) {
            writeCompleted = true
            resolve()
          }
        })
      },
    }
    const talentRepository = rawTalentRepository as unknown as ConstructorParameters<
      typeof TalentSearchProjectionCommands
    >[0]
    const rawTalentBuilder = {
      build: () =>
        Promise.resolve({
          user_id: 'user-1',
          status: 'active',
          is_searchable: true,
        }),
    }
    const talentBuilder = rawTalentBuilder as unknown as ConstructorParameters<
      typeof TalentSearchProjectionCommands
    >[1]
    const service = new TalentSearchProjectionCommands(
      talentRepository,
      talentBuilder,
      {
        listActiveUserIds: () => Promise.resolve([]),
        listNotDeletedUserIds: () => Promise.resolve([]),
      },
      { isEnabled: () => true }
    )

    const delivery = service.reindexDocument('user-1', controller.signal)
    await writeStarted
    controller.abort(new Error('durable delivery deadline exceeded'))

    await assert.rejects(() => delivery, 'durable delivery deadline exceeded')
    assert.strictEqual(observedSignal, controller.signal)
    assert.isFalse(writeCompleted)
  })

  test('talent reindex aborts after a late document build without writing', async ({ assert }) => {
    const controller = new AbortController()
    let finishBuild: (() => void) | undefined
    let observedSignal: AbortSignal | undefined
    let writeCount = 0
    const rawTalentRepository = {
      ensureIndex: () => Promise.resolve(),
      resetIndex: () => Promise.resolve(),
      bulkUpsertDocuments: () => Promise.resolve(),
      deleteDocument: () => {
        writeCount += 1
        return Promise.resolve()
      },
      upsertDocument: () => {
        writeCount += 1
        return Promise.resolve()
      },
    }
    const talentRepository = rawTalentRepository as unknown as ConstructorParameters<
      typeof TalentSearchProjectionCommands
    >[0]
    const rawTalentBuilder = {
      build: (_userId: string, signal?: AbortSignal) => {
        observedSignal = signal
        return new Promise<{
          user_id: string
          status: string
          is_searchable: boolean
        }>((resolve) => {
          finishBuild = () =>
            resolve({
              user_id: 'user-1',
              status: 'active',
              is_searchable: true,
            })
        })
      },
    }
    const talentBuilder = rawTalentBuilder as unknown as ConstructorParameters<
      typeof TalentSearchProjectionCommands
    >[1]
    const service = new TalentSearchProjectionCommands(
      talentRepository,
      talentBuilder,
      {
        listActiveUserIds: () => Promise.resolve([]),
        listNotDeletedUserIds: () => Promise.resolve([]),
      },
      { isEnabled: () => true }
    )

    const delivery = service.reindexDocument('user-1', controller.signal)
    await Promise.resolve()
    controller.abort(new Error('durable delivery deadline exceeded'))
    finishBuild?.()

    await assert.rejects(() => delivery, 'durable delivery deadline exceeded')
    assert.strictEqual(observedSignal, controller.signal)
    assert.equal(writeCount, 0)
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
      replaceAllDocuments: (documents: Array<{ user_id: string }>) => {
        calls.push(`repo:replace:${documents.map((document) => document.user_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const talentRepository = rawTalentRepository as unknown as ConstructorParameters<
      typeof TalentSearchProjectionCommands
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
      typeof TalentSearchProjectionCommands
    >[1]

    const service = new TalentSearchProjectionCommands(
      talentRepository,
      talentBuilder,
      {
        listActiveUserIds: () => {
          calls.push('reader:active')
          return Promise.resolve(['user-1', 'skip-user', 'user-2'])
        },
        listNotDeletedUserIds: () => Promise.resolve([]),
      } satisfies UserSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'reader:active',
      'builder:user-1',
      'builder:skip-user',
      'builder:user-2',
      'repo:replace:user-1,user-2',
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
      replaceAllDocuments: (documents: Array<{ user_id: string }>) => {
        calls.push(`repo:replace:${documents.map((document) => document.user_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const directoryRepository = rawDirectoryRepository as unknown as ConstructorParameters<
      typeof UserDirectorySearchProjectionCommands
    >[0]
    const rawDirectoryBuilder = {
      build: (userId: string) => {
        calls.push(`builder:${userId}`)
        return Promise.resolve({
          user_id: userId,
          status: 'active',
          deleted_at: userId === 'deleted-user' ? '2026-01-01T00:00:00.000Z' : null,
        })
      },
    }
    const directoryBuilder = rawDirectoryBuilder as unknown as ConstructorParameters<
      typeof UserDirectorySearchProjectionCommands
    >[1]

    const service = new UserDirectorySearchProjectionCommands(
      directoryRepository,
      directoryBuilder,
      {
        listActiveUserIds: () => Promise.resolve([]),
        listNotDeletedUserIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['user-1', 'deleted-user', 'user-2'])
        },
      } satisfies UserSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'reader:notDeleted',
      'builder:user-1',
      'builder:deleted-user',
      'builder:user-2',
      'repo:replace:user-1,user-2',
    ])
  })
})
