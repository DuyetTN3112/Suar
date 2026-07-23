import { test } from '@japa/runner'

import { SearchEngineCapabilityAdapter } from '#composition/adapters/search/search_engine_capability_adapter'

test.group('Unit | Search Engine Capability Adapter', () => {
  test('delegates every search intent to its dedicated query', async ({ assert }) => {
    const calls: string[] = []
    const adapter = new SearchEngineCapabilityAdapter({
      runtime: {
        isEnabled: () => true,
      },
      projects: {
        handle: ({ q, limit }) => {
          calls.push(`projects:${q}:${limit}`)
          return Promise.resolve([{ projectId: 'project-1', score: 1 }])
        },
      },
      users: {
        handle: ({ q, limit }) => {
          calls.push(`users:${q}:${limit}`)
          return Promise.resolve([{ userId: 'user-1', score: 1 }])
        },
      },
      organizations: {
        handle: ({ q, limit }) => {
          calls.push(`organizations:${q}:${limit}`)
          return Promise.resolve([{ organizationId: 'organization-1', score: 1 }])
        },
      },
      tasks: {
        handle: ({ organizationId, q, limit }) => {
          calls.push(`tasks:${organizationId}:${q}:${limit}`)
          return Promise.resolve([{ taskId: 'task-1', score: 1 }])
        },
      },
      publicTasks: {
        handle: ({ q, limit }) => {
          calls.push(`public-tasks:${q}:${limit}`)
          return Promise.resolve([{ taskId: 'task-2', score: 1 }])
        },
      },
      talents: {
        handle: ({ q, limit }, signal) => {
          calls.push(`talents:${q}:${limit}:${String(signal?.aborted ?? false)}`)
          return Promise.resolve([{ userId: 'talent-1', score: 1 }])
        },
      },
      skills: {
        handle: ({ q, limit }) => {
          calls.push(`skills:${q}:${limit}`)
          return Promise.resolve([{ skillId: 'skill-1', score: 1 }])
        },
      },
    })
    const signal = new AbortController().signal

    assert.isTrue(adapter.isEnabled())
    assert.deepEqual(await adapter.searchProjects({ q: 'p', limit: 1 }), [
      { projectId: 'project-1', score: 1 },
    ])
    assert.deepEqual(await adapter.searchUsers({ q: 'u', limit: 2 }), [
      { userId: 'user-1', score: 1 },
    ])
    assert.deepEqual(await adapter.searchOrganizations({ q: 'o', limit: 3 }), [
      { organizationId: 'organization-1', score: 1 },
    ])
    assert.deepEqual(
      await adapter.searchTasks({ organizationId: 'organization-1', q: 't', limit: 4 }),
      [{ taskId: 'task-1', score: 1 }]
    )
    assert.deepEqual(await adapter.searchPublicTasks({ q: 'pt', limit: 5 }), [
      { taskId: 'task-2', score: 1 },
    ])
    assert.deepEqual(await adapter.searchTalents({ q: 'ta', limit: 6 }, signal), [
      { userId: 'talent-1', score: 1 },
    ])
    assert.deepEqual(await adapter.searchSkills({ q: 's', limit: 7 }), [
      { skillId: 'skill-1', score: 1 },
    ])
    assert.deepEqual(calls, [
      'projects:p:1',
      'users:u:2',
      'organizations:o:3',
      'tasks:organization-1:t:4',
      'public-tasks:pt:5',
      'talents:ta:6:false',
      'skills:s:7',
    ])
  })
})
