import { test } from '@japa/runner'

import {
  type GlobalSearchDependencies,
  type GlobalSearchDependency,
} from '../support/global_search_query_test_support.js'

import { makeSystemHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { GlobalSearchQuery } from '#modules/search/actions/queries/search-discovery/global_search_query'

test.group('Unit | Search Global Search Query - Fanout & Input Validation', () => {
  test('returns stable empty grouped payload for blank query input', async ({ assert }) => {
    const result = await new GlobalSearchQuery(makeSystemHttpActionContext('system-user')).handle(
      '   '
    )

    assert.deepEqual(result, {
      query: '',
      talents: [],
      tasks: [],
      projects: [],
      skills: [],
      organizations: [],
      comments: [],
      results: [],
      candidateResultCount: 0,
      candidateFieldFacets: [],
      candidateTotalByType: {
        all: 0,
        talent: 0,
        task: 0,
        project: 0,
        skill: 0,
        organization: 0,
        comment: 0,
      },
      resultLimit: 24,
      resultsTruncated: false,
      sourceStatuses: [],
    })
  })

  test('emits started and completed events with grouped result counts', async ({ assert }) => {
    const calls: string[] = []
    const rawSearchTalents = (_input: unknown, _execCtx: unknown) =>
      Promise.resolve([{ id: 'user-1' }])
    const searchTalents = rawSearchTalents as unknown as GlobalSearchDependency<'searchTalents'>
    const rawListPublicTasks = (_input: unknown, _execCtx: unknown) =>
      Promise.resolve({ data: [{ id: 'task-1' }] })
    const listPublicTasks =
      rawListPublicTasks as unknown as GlobalSearchDependency<'listPublicTasks'>
    const rawListProjects = (_input: unknown, _execCtx: unknown) =>
      Promise.resolve({ data: [{ id: 'project-1' }] })
    const listProjects = rawListProjects as unknown as GlobalSearchDependency<'listProjects'>
    const rawListActiveSkillsCatalog = (_input: unknown) => Promise.resolve([{ id: 'skill-1' }])
    const listActiveSkillsCatalog =
      rawListActiveSkillsCatalog as unknown as GlobalSearchDependency<'listActiveSkillsCatalog'>
    const rawSearchOrganizationsBasicList = (_query: string, _limit?: number) =>
      Promise.resolve([{ id: 'organization-1', name: 'Org 1' }])
    const searchOrganizationsBasicList = rawSearchOrganizationsBasicList
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          calls.push(event.event_name)
          calls.push(JSON.stringify(event.change ?? {}))
        },
      },
      searchTalents,
      listPublicTasks,
      listProjects,
      listActiveSkillsCatalog,
      searchOrganizationsBasicList,
    }

    const result = await new GlobalSearchQuery(
      {
        ...makeSystemHttpActionContext('system-user'),
        requestId: 'req-1',
        traceId: 'trace-1',
      },
      dependencies
    ).handle('Elastic Search')

    assert.equal(result.talents.length, 1)
    assert.include(calls, 'search.query.started')
    assert.include(calls, 'search.query.completed')
    assert.isTrue(calls.some((entry) => entry.includes('"talents":1')))
    assert.isTrue(calls.some((entry) => entry.includes('"tasks":1')))
  })

  test('fans out one-character queries without fuzzy matching', async ({ assert }) => {
    const calls = {
      talents: 0,
      tasks: 0,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    }
    const completedChanges: string[] = []
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          if (event.event_name === 'search.query.completed') {
            completedChanges.push(JSON.stringify(event.change ?? {}))
          }
        },
      },
      searchTalents: () => {
        calls.talents += 1
        return Promise.resolve([])
      },
      listPublicTasks: (() => {
        calls.tasks += 1
        return Promise.resolve({ data: [] })
      }) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() => {
        calls.projects += 1
        return Promise.resolve({ data: [] })
      }) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: () => {
        calls.skills += 1
        return Promise.resolve([])
      },
      searchOrganizationsBasicList: () => {
        calls.organizations += 1
        return Promise.resolve([])
      },
      searchTaskComments: () => {
        calls.comments += 1
        return Promise.resolve([])
      },
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('d')

    assert.deepEqual(calls, {
      talents: 1,
      tasks: 1,
      projects: 1,
      skills: 1,
      organizations: 1,
      comments: 1,
    })
    assert.deepEqual(
      result.sourceStatuses.map((status) => status.status),
      ['ok', 'ok', 'ok', 'ok', 'ok', 'ok']
    )
    assert.isTrue(
      result.sourceStatuses.every(
        (status) =>
          status.resultCount === 0 &&
          status.durationMs >= 0 &&
          status.errorMessage === null
      )
    )
    assert.equal(result.results.length, 0)
    assert.isFalse(completedChanges.some((entry) => entry.includes('"skipped":true')))
  })

  test('clamps long queries before source fanout to keep search bounded', async ({ assert }) => {
    const seenQueries: string[] = []
    const longQuery = `  ${'duyet '.repeat(80)}  `
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: (input: { q: string }) => {
        seenQueries.push(input.q)
        return Promise.resolve([])
      },
      listPublicTasks: ((input: { keyword: string }) => {
        seenQueries.push(input.keyword)
        return Promise.resolve({ data: [] })
      }) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: ((input: { search: string }) => {
        seenQueries.push(input.search)
        return Promise.resolve({ data: [] })
      }) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: ((input: { q: string }) => {
        seenQueries.push(input.q)
        return Promise.resolve([])
      }) as GlobalSearchDependency<'listActiveSkillsCatalog'>,
      searchOrganizationsBasicList: (query: string) => {
        seenQueries.push(query)
        return Promise.resolve([])
      },
      searchTaskComments: (query: string) => {
        seenQueries.push(query)
        return Promise.resolve([])
      },
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle(longQuery)

    assert.isAtMost(result.query.length, 160)
    assert.isTrue(result.query.endsWith('duyet'))
    assert.equal(seenQueries.length, 6)
    assert.isTrue(seenQueries.every((query) => query === result.query))
  })

  test('limits source fanout to requested entity types', async ({ assert }) => {
    const calls = {
      talents: 0,
      tasks: 0,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    }
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: () => {
        calls.talents += 1
        return Promise.resolve([])
      },
      listPublicTasks: (() => {
        calls.tasks += 1
        return Promise.resolve({
          data: [
            {
              id: 'task-only',
              title: 'Duyet task only',
              description: 'Task source should run alone.',
            },
          ],
        })
      }) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() => {
        calls.projects += 1
        return Promise.resolve({ data: [] })
      }) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: () => {
        calls.skills += 1
        return Promise.resolve([])
      },
      searchOrganizationsBasicList: () => {
        calls.organizations += 1
        return Promise.resolve([])
      },
      searchTaskComments: () => {
        calls.comments += 1
        return Promise.resolve([])
      },
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet', { entityTypes: ['task'] })

    assert.deepEqual(calls, {
      talents: 0,
      tasks: 1,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    })
    assert.deepEqual(
      result.sourceStatuses.map((status) => status.source),
      ['tasks']
    )
    assert.deepEqual(
      result.results.map((item) => item.entityType),
      ['task']
    )
  })
})
