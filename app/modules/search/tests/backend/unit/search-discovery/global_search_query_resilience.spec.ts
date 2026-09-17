import { test } from '@japa/runner'

import {
  type GlobalSearchDependencies,
  type GlobalSearchDependency,
} from '../support/global_search_query_test_support.js'

import { makeSystemHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { GlobalSearchQuery } from '#modules/search/actions/queries/search-discovery/global_search_query'

test.group('Unit | Search Global Search Query - Resilience & Fault Tolerance', () => {
  test('returns partial results when one search source fails without extra source calls', async ({
    assert,
  }) => {
    const calls: {
      talents: number
      tasks: number
      projects: number
      skills: number
      organizations: number
      comments: number
    } = {
      talents: 0,
      tasks: 0,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    }
    const completedEvents: Array<{
      event_name: string
      outcome: string
      severity: string
      change: Record<string, unknown> | null
    }> = []
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          if (event.event_name === 'search.query.completed') {
            completedEvents.push(event)
          }
        },
      },
      searchTalents: () => {
        calls.talents += 1
        throw new Error('talent engine unavailable')
      },
      listPublicTasks: (() => {
        calls.tasks += 1
        return Promise.resolve({
          data: [
            {
              id: 'task-1',
              title: 'Duyet',
              description: 'Still searchable when talents fail.',
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
    ).handle('duyet')

    assert.deepEqual(calls, {
      talents: 1,
      tasks: 1,
      projects: 1,
      skills: 1,
      organizations: 1,
      comments: 1,
    })
    assert.equal(result.talents.length, 0)
    assert.equal(result.tasks.length, 1)
    assert.equal(result.results[0]?.id, 'task:task-1:title')
    const talentStatus = result.sourceStatuses.find((status) => status.source === 'talents')
    assert.equal(talentStatus?.status, 'failed')
    assert.equal(talentStatus?.resultCount, 0)
    assert.equal(talentStatus?.errorMessage, 'Search source unavailable')
    assert.isAtLeast(talentStatus?.durationMs ?? 0, 0)
    const taskStatus = result.sourceStatuses.find((status) => status.source === 'tasks')
    assert.equal(taskStatus?.status, 'ok')
    assert.equal(taskStatus?.resultCount, 1)
    assert.equal(taskStatus?.errorMessage, null)
    assert.lengthOf(completedEvents, 1)
    assert.equal(completedEvents[0]?.outcome, 'warning')
    assert.equal(completedEvents[0]?.severity, 'warn')
    assert.deepInclude(completedEvents[0]?.change?.['source_health'], {
      ok: 5,
      failed: 1,
      timed_out: 0,
    })
    assert.equal(completedEvents[0]?.change?.['ranking_algorithm'], 'weighted_rrf_v1')
  })

  test('times out a slow source and returns other source results without extra calls', async ({
    assert,
  }) => {
    const calls = {
      talents: 0,
      tasks: 0,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    }
    const completedChanges: string[] = []
    let talentSignalAborted = false
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          if (event.event_name === 'search.query.completed') {
            completedChanges.push(JSON.stringify(event.change ?? {}))
          }
        },
      },
      sourceTimeoutMs: 5,
      searchTalents: ((_input: unknown, _ctx: unknown, signal?: AbortSignal) => {
        calls.talents += 1
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve([{ id: 'late-talent' }])
          }, 50)
          signal?.addEventListener(
            'abort',
            () => {
              talentSignalAborted = true
              reject(signal.reason)
            },
            { once: true }
          )
        })
      }) as unknown as GlobalSearchDependency<'searchTalents'>,
      listPublicTasks: (() => {
        calls.tasks += 1
        return Promise.resolve({
          data: [
            {
              id: 'task-fast',
              title: 'Duyet fast path',
              description: 'Fast task source should survive slow talent source.',
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
    ).handle('duyet')

    assert.equal(result.talents.length, 0)
    assert.equal(result.tasks.length, 1)
    assert.equal(result.results[0]?.id, 'task:task-fast:title')
    const talentStatus = result.sourceStatuses.find((status) => status.source === 'talents')
    assert.equal(talentStatus?.status, 'timed_out')
    assert.equal(talentStatus?.resultCount, 0)
    assert.equal(talentStatus?.errorMessage, 'Search source deadline exceeded')
    assert.isTrue(talentSignalAborted)
    assert.isAtLeast(talentStatus?.durationMs ?? 0, 1)
    assert.deepEqual(calls, {
      talents: 1,
      tasks: 1,
      projects: 1,
      skills: 1,
      organizations: 1,
      comments: 1,
    })
    assert.isTrue(completedChanges.some((entry) => entry.includes('"degraded":true')))
  })
})
