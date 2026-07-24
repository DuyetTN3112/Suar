import { test } from '@japa/runner'

import { SearchPublicApiAdapter } from '#composition/adapters/search/search_public_api_adapter'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import {
  SearchDiscoveryError,
  type SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

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
      makeSearchDiscoveryQuery: () => ({
        execute: () => Promise.reject(new Error('Discovery is outside this delegation case')),
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

  test('delegates discovery with a server-derived principal and request identity', async ({
    assert,
  }) => {
    const observed: unknown[] = []
    const controller = new AbortController()
    const discoveryResponse = {
      context: 'tasks.discovery.member',
      schemaVersion: 1,
      canonicalCriteria: {
        context: 'tasks.discovery.member',
        schemaVersion: 1,
        sort: [],
        page: { size: 10 },
      },
      hits: [],
      total: { value: 0, relation: 'eq' },
      facets: [],
      suggestions: [],
      diagnostics: [],
      page: {},
      execution: {
        provider: 'test',
        degraded: false,
        partial: false,
        requestId: 'request-from-context',
      },
      search: {
        scope: 'task',
        inputMode: 'browse',
        submittedQuery: '',
        normalizedQuery: '',
        retrievalMode: 'auto',
        rankingVersion: 'tasks.lexical.v1',
        searchSessionId: 'session-from-options',
        requestId: 'request-from-context',
        diagnostics: [],
        sources: [],
      },
      authority: {
        hits: { state: 'authoritative', sources: ['tasks'] },
        total: { state: 'authoritative', sources: ['tasks'] },
        facets: [],
      },
    } satisfies SearchDiscoveryResponse

    const deps = makeDependencies({
      makeSearchDiscoveryQuery: () => ({
        execute: (input) => {
          observed.push(input)
          return Promise.resolve(discoveryResponse)
        },
      }),
    })
    const api = new SearchPublicApiAdapter(deps)
    const request = discoveryRequest('tasks.discovery.member')
    const context: HttpActionContext = {
      userId: 'user-1',
      ip: '127.0.0.1',
      userAgent: 'test',
      organizationId: 'org-1',
      actorRoleSurface: 'org_member',
      requestId: 'request-from-context',
    }

    const result = await api.discover(request, context, {
      signal: controller.signal,
      searchSessionId: 'session-from-options',
    })

    assert.strictEqual(result, discoveryResponse)
    assert.lengthOf(observed, 1)
    assert.deepEqual(observed[0], {
      request,
      principal: {
        kind: 'user',
        id: 'user-1',
        organizationId: 'org-1',
        organizationRole: 'org_member',
      },
      requestId: 'request-from-context',
      searchSessionId: 'session-from-options',
      signal: controller.signal,
    })
  })

  test('uses anonymous principal and does not trust an unknown role surface', async ({
    assert,
  }) => {
    const observed: unknown[] = []
    const deps = makeDependencies({
      makeSearchDiscoveryQuery: () => ({
        execute: (input) => {
          observed.push(input)
          return Promise.resolve(stubDiscoveryResponse())
        },
      }),
    })
    const api = new SearchPublicApiAdapter(deps)

    await api.discover(
      discoveryRequest('tasks.discovery.public'),
      {
        userId: null,
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: 'org-should-not-be-trusted',
        actorRoleSurface: 'org_owner',
      },
      { searchSessionId: 'session-anonymous-1' }
    )
    await api.discover(
      discoveryRequest('tasks.discovery.member'),
      {
        userId: 'user-2',
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: 'org-2',
        actorRoleSurface: 'unexpected-admin',
      },
      { searchSessionId: 'session-user-2-1' }
    )
    await api.discover(
      discoveryRequest('tasks.discovery.member'),
      {
        userId: 'user-3',
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: 'org-3',
        actorRoleSurface: 'org_owner',
      },
      { searchSessionId: 'session-user-3-1' }
    )

    assert.deepEqual(observed[0], {
      request: discoveryRequest('tasks.discovery.public'),
      principal: { kind: 'anonymous' },
      requestId: 'search-api-discovery-request-1',
      searchSessionId: 'session-anonymous-1',
    })
    assert.deepEqual(observed[1], {
      request: discoveryRequest('tasks.discovery.member'),
      principal: { kind: 'user', id: 'user-2', organizationId: 'org-2' },
      requestId: 'search-api-discovery-request-2',
      searchSessionId: 'session-user-2-1',
    })
    assert.deepEqual(observed[2], {
      request: discoveryRequest('tasks.discovery.member'),
      principal: {
        kind: 'user',
        id: 'user-3',
        organizationId: 'org-3',
        organizationRole: 'org_owner',
      },
      requestId: 'search-api-discovery-request-3',
      searchSessionId: 'session-user-3-1',
    })
  })

  test('fails closed with an explicit disabled-index diagnostic before provider execution', async ({
    assert,
  }) => {
    const api = new SearchPublicApiAdapter(
      makeDependencies({
        runtime: { isEnabled: () => false, ping: () => Promise.resolve(false) },
        makeSearchDiscoveryQuery: () => ({
          execute: () => Promise.reject(new Error('provider must not execute')),
        }),
      })
    )

    const error = await api
      .discover(discoveryRequest('tasks.discovery.public'), {
        userId: null,
        ip: '127.0.0.1',
        userAgent: 'test',
        organizationId: null,
      })
      .catch((caught: unknown) => caught)

    assert.instanceOf(error, SearchDiscoveryError)
    assert.equal((error as SearchDiscoveryError).code, 'SEARCH_INDEX_DISABLED')
  })
})

function makeDependencies(
  overrides: Partial<ConstructorParameters<typeof SearchPublicApiAdapter>[0]> = {}
): ConstructorParameters<typeof SearchPublicApiAdapter>[0] {
  let requestNumber = 0
  return {
    runtime: { isEnabled: () => true, ping: () => Promise.resolve(true) },
    talents: {
      indexName: () => 'talents-index',
      ensureIndex: () => Promise.resolve(),
      resetIndex: () => Promise.resolve(),
      reindexDocument: () => Promise.resolve(),
      reindexDocumentFenced: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    tasks: {
      indexName: () => 'tasks-index',
      reindexDocument: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      removeDocumentQuietly: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    projects: {
      indexName: () => 'projects-index',
      reindexDocument: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      removeDocumentQuietly: () => Promise.resolve(),
      removeDocument: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    skills: {
      indexName: () => 'skills-index',
      reindexDocument: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    organizations: {
      indexName: () => 'organizations-index',
      reindexDocument: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      removeDocumentQuietly: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    userDirectory: {
      indexName: () => 'users-index',
      reindexDocument: () => Promise.resolve(),
      reindexDocumentFenced: () => Promise.resolve(),
      reindexDocumentQuietly: () => Promise.resolve(),
      removeDocumentQuietly: () => Promise.resolve(),
      reindexAll: () => Promise.resolve({ indexed: 0, skipped: 0 }),
    },
    makeGlobalSearchQuery: () => ({
      handle: () => Promise.reject(new Error('Global search is outside this test')),
    }),
    makeSearchDiscoveryQuery: () => ({
      execute: () => Promise.reject(new Error('Discovery is outside this test')),
    }),
    requestIdGenerator: () => `search-api-discovery-request-${++requestNumber}`,
    ...overrides,
  }
}

function discoveryRequest(context: string) {
  return {
    criteria: {
      context,
      schemaVersion: 1,
      sort: [],
      page: { size: 10 },
    },
    search: { scope: 'task' as const },
  }
}

function stubDiscoveryResponse(): SearchDiscoveryResponse {
  const request = discoveryRequest('tasks.discovery.member')
  return {
    context: request.criteria.context,
    schemaVersion: request.criteria.schemaVersion,
    canonicalCriteria: request.criteria,
    hits: [],
    total: { value: 0, relation: 'eq' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: {
      provider: 'test',
      degraded: false,
      partial: false,
      requestId: 'request-test',
    },
    search: {
      scope: 'task',
      inputMode: 'browse',
      submittedQuery: '',
      normalizedQuery: '',
      retrievalMode: 'auto',
      rankingVersion: 'tasks.lexical.v1',
      searchSessionId: 'session-test',
      requestId: 'request-test',
      diagnostics: [],
      sources: [],
    },
    authority: {
      hits: { state: 'authoritative', sources: ['tasks'] },
      total: { state: 'authoritative', sources: ['tasks'] },
      facets: [],
    },
  }
}
