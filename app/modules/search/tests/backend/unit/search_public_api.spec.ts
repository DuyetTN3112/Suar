import { test } from '@japa/runner'

import { SearchPublicApiAdapter } from '#composition/adapters/search_public_api_adapter'

test.group('Unit | Search Public API', () => {
  test('delegates runtime and projection operations to Search command handlers', async ({
    assert,
  }) => {
    const calls: string[] = []
    const controller = new AbortController()
    let observedTalentSignal: AbortSignal | undefined
    let observedProjectContext: unknown
    const deps: ConstructorParameters<typeof SearchPublicApiAdapter>[0] = {
      runtime: {
        isEnabled: () => true,
        ping: () => {
          calls.push('runtime:ping')
          return Promise.resolve(true)
        },
      },
      talents: {
        indexName: () => 'talents-index',
        ensureIndex: () => {
          calls.push('talents:ensure')
          return Promise.resolve()
        },
        resetIndex: () => {
          calls.push('talents:reset')
          return Promise.resolve()
        },
        reindexDocument: (id: string, signal?: AbortSignal) => {
          observedTalentSignal = signal
          calls.push(`talents:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentFenced: (id: string) => {
          calls.push(`talents:reindexFenced:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`talents:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => {
          calls.push('talents:reindexAll')
          return Promise.resolve({ indexed: 1, skipped: 0 })
        },
      },
      tasks: {
        indexName: () => 'tasks-index',
        reindexDocument: (id: string) => {
          calls.push(`tasks:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`tasks:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        removeDocumentQuietly: (id: string) => {
          calls.push(`tasks:removeQuiet:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => Promise.resolve({ indexed: 2, skipped: 1 }),
      },
      projects: {
        indexName: () => 'projects-index',
        reindexDocument: (id: string) => {
          calls.push(`projects:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`projects:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        removeDocumentQuietly: (id: string) => {
          calls.push(`projects:removeQuiet:${id}`)
          return Promise.resolve()
        },
        removeDocument: (id: string, context) => {
          observedProjectContext = context
          calls.push(`projects:remove:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
      },
      skills: {
        indexName: () => 'skills-index',
        reindexDocument: (id: string) => {
          calls.push(`skills:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`skills:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
      },
      organizations: {
        indexName: () => 'organizations-index',
        reindexDocument: (id: string) => {
          calls.push(`organizations:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`organizations:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        removeDocumentQuietly: (id: string) => {
          calls.push(`organizations:removeQuiet:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
      },
      userDirectory: {
        indexName: () => 'users-index',
        reindexDocument: (id: string) => {
          calls.push(`users:reindex:${id}`)
          return Promise.resolve()
        },
        reindexDocumentFenced: (id: string) => {
          calls.push(`users:reindexFenced:${id}`)
          return Promise.resolve()
        },
        reindexDocumentQuietly: (id: string) => {
          calls.push(`users:reindexQuiet:${id}`)
          return Promise.resolve()
        },
        removeDocumentQuietly: (id: string) => {
          calls.push(`users:removeQuiet:${id}`)
          return Promise.resolve()
        },
        reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
      },
      makeGlobalSearchQuery: () => ({
        handle: () => Promise.reject(new Error('Global search is outside this delegation case')),
      }),
    }

    const api = new SearchPublicApiAdapter(deps)

    assert.isTrue(api.isEnabled())
    assert.isTrue(await api.ping())
    assert.equal(api.talentIndexName(), 'talents-index')
    assert.equal(api.taskIndexName(), 'tasks-index')
    assert.equal(api.projectIndexName(), 'projects-index')
    assert.equal(api.skillIndexName(), 'skills-index')
    assert.equal(api.organizationIndexName(), 'organizations-index')
    assert.equal(api.userDirectoryIndexName(), 'users-index')

    await api.ensureTalentIndex()
    await api.resetTalentIndex()
    await api.reindexTalentDocument('user-1', controller.signal)
    await api.reindexTaskDocumentQuietly('task-1')
    await api.removeProjectDocument('project-1', {
      signal: controller.signal,
      externalVersion: 73,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    })
    await api.removeProjectDocumentQuietly('project-1')
    const result = await api.reindexAllTalents()

    assert.deepEqual(result, { indexed: 1, skipped: 0 })
    assert.strictEqual(observedTalentSignal, controller.signal)
    assert.deepEqual(observedProjectContext, {
      signal: controller.signal,
      externalVersion: 73,
      tombstoneAt: '2026-07-26T10:00:00.000Z',
    })
    assert.deepEqual(calls, [
      'runtime:ping',
      'talents:ensure',
      'talents:reset',
      'talents:reindex:user-1',
      'tasks:reindexQuiet:task-1',
      'projects:remove:project-1',
      'projects:removeQuiet:project-1',
      'talents:reindexAll',
    ])
  })
})
