import { test } from '@japa/runner'

import { TalentSearchIndexRepository } from '#modules/search/infra/talents/talent_search_index_repository'
import { UserDirectorySearchIndexRepository } from '#modules/search/infra/users/user_directory_search_index_repository'

function makeClient(indexCalls: Array<{ params: unknown; options: unknown }>) {
  return {
    indices: {
      existsAlias: () => Promise.resolve(true),
      exists: () => Promise.resolve(true),
    },
    index: (params: unknown, options: unknown) => {
      indexCalls.push({ params, options })
      return Promise.resolve()
    },
  }
}

test.group('User search index lifecycle fencing', () => {
  test('creates identifier fields that split punctuation for natural user queries', async ({
    assert,
  }) => {
    const createCalls: unknown[] = []
    const client = {
      indices: {
        existsAlias: () => Promise.resolve(false),
        exists: () => Promise.resolve(false),
        create: (params: unknown) => {
          createCalls.push(params)
          return Promise.resolve()
        },
      },
    }
    const repository = new UserDirectorySearchIndexRepository(
      client as unknown as ConstructorParameters<typeof UserDirectorySearchIndexRepository>[0]
    )

    await repository.ensureIndex()

    const createRequest = createCalls[0] as {
      mappings?: { properties?: Record<string, unknown> }
    }
    assert.deepInclude(createRequest, {
      settings: {
        analysis: {
          tokenizer: {
            suar_identifier_tokenizer: {
              type: 'pattern',
              pattern: '[^\\p{L}\\p{N}]+',
            },
          },
          analyzer: {
            suar_identifier: {
              type: 'custom',
              tokenizer: 'suar_identifier_tokenizer',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
    })
    assert.deepInclude(createRequest.mappings?.properties?.['username'], {
      type: 'text',
      analyzer: 'suar_identifier',
      search_analyzer: 'suar_identifier',
    })
    assert.deepInclude(createRequest.mappings?.properties?.['email'], {
      type: 'text',
      analyzer: 'suar_identifier',
      search_analyzer: 'suar_identifier',
    })
  })

  test('writes persistent directory and talent tombstones at one external version', async ({
    assert,
  }) => {
    const directoryCalls: Array<{ params: unknown; options: unknown }> = []
    const talentCalls: Array<{ params: unknown; options: unknown }> = []
    const directoryClient = makeClient(directoryCalls)
    const talentClient = makeClient(talentCalls)
    const directory = new UserDirectorySearchIndexRepository(
      directoryClient as unknown as ConstructorParameters<
        typeof UserDirectorySearchIndexRepository
      >[0]
    )
    const talent = new TalentSearchIndexRepository(
      talentClient as unknown as ConstructorParameters<typeof TalentSearchIndexRepository>[0]
    )
    const controller = new AbortController()
    const context = {
      signal: controller.signal,
      externalVersion: 101,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    }

    await directory.deleteDocumentFenced('user-1', context)
    await talent.deleteDocumentFenced('user-1', context)

    for (const call of [...directoryCalls, ...talentCalls]) {
      assert.include(call.params, {
        id: 'user-1',
        version: 101,
        version_type: 'external_gte',
      })
      assert.deepEqual(call.options, { signal: controller.signal })
    }
    assert.deepInclude(directoryCalls[0]?.params, {
      document: {
        user_id: 'user-1',
        status: 'inactive',
        deleted_at: context.tombstoneAt,
      },
    })
    assert.deepInclude(talentCalls[0]?.params, {
      document: {
        user_id: 'user-1',
        status: 'inactive',
        is_searchable: false,
        updated_at: context.tombstoneAt,
      },
    })
  })

  test('rejects missing versions before an Elasticsearch request starts', async ({ assert }) => {
    let calls = 0
    const client = {
      indices: {
        exists: () => {
          calls += 1
          return Promise.resolve(true)
        },
      },
    }
    const repository = new UserDirectorySearchIndexRepository(
      client as unknown as ConstructorParameters<typeof UserDirectorySearchIndexRepository>[0]
    )

    await assert.rejects(
      () =>
        repository.deleteDocumentFenced('user-1', {
          tombstoneAt: '2026-07-26T10:00:00.000Z',
        }),
      /positive safe integer/
    )
    assert.equal(calls, 0)
  })
})
