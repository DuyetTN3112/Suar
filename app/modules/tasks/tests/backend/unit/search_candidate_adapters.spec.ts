import { test } from '@japa/runner'

import { SearchTalentCandidateAdapter } from '#composition/adapters/search/search_talent_candidate_adapter'
import { SearchTasksCandidateAdapter } from '#composition/adapters/search/search_tasks_candidate_adapter'
import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'

function makeSearchEngineCapability(
  overrides: Partial<SearchEngineCapability> = {}
): SearchEngineCapability {
  return {
    isEnabled: () => false,
    searchProjects: () => Promise.resolve([]),
    searchUsers: () => Promise.resolve([]),
    searchOrganizations: () => Promise.resolve([]),
    searchTasks: () => Promise.resolve([]),
    searchPublicTasks: () => Promise.resolve([]),
    searchTalents: () => Promise.resolve([]),
    searchSkills: () => Promise.resolve([]),
    ...overrides,
  }
}

test.group('Unit | Search candidate outer adapters', () => {
  test('maps provider task candidates to both Tasks-owned reader contracts', async ({
    assert,
  }) => {
    const calls: unknown[] = []
    const adapter = new SearchTasksCandidateAdapter(
      makeSearchEngineCapability({
        isEnabled: () => true,
        searchPublicTasks: (input) => {
          calls.push(['public', input])
          return Promise.resolve([{ taskId: 'public-task', score: 0.91 }])
        },
        searchTasks: (input) => {
          calls.push(['organization', input])
          return Promise.resolve([{ taskId: 'organization-task', score: 0.82 }])
        },
      })
    )

    assert.isTrue(adapter.isEnabled())
    assert.deepEqual(
      await adapter.searchPublicTaskCandidates({ q: 'public search', limit: 12 }),
      [{ taskId: 'public-task', score: 0.91 }]
    )
    assert.deepEqual(
      await adapter.searchOrganizationTaskCandidates({
        q: 'organization search',
        organizationId: 'organization-1',
        limit: 24,
      }),
      [{ taskId: 'organization-task', score: 0.82 }]
    )
    assert.deepEqual(calls, [
      ['public', { q: 'public search', limit: 12 }],
      [
        'organization',
        {
          q: 'organization search',
          organizationId: 'organization-1',
          limit: 24,
        },
      ],
    ])
  })

  test('maps provider talent candidates and availability to the Users-owned reader', async ({
    assert,
  }) => {
    const observedSignals: Array<AbortSignal | undefined> = []
    const adapter = new SearchTalentCandidateAdapter(
      makeSearchEngineCapability({
        isEnabled: () => true,
        searchTalents: (input, signal) => {
          observedSignals.push(signal)
          assert.deepEqual(input, { q: 'typescript', limit: 15 })
          return Promise.resolve([{ userId: 'talent-1', score: 0.77 }])
        },
      })
    )
    const controller = new AbortController()

    assert.isTrue(adapter.isEnabled())
    assert.deepEqual(
      await adapter.searchTalentCandidates(
        {
          q: 'typescript',
          limit: 15,
        },
        controller.signal
      ),
      [{ userId: 'talent-1', score: 0.77 }]
    )
    assert.deepEqual(observedSignals, [controller.signal])
  })
})
