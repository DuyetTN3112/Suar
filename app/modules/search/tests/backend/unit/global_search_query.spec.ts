import { test } from '@japa/runner'

import { makeSystemHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { GlobalSearchQuery } from '#modules/search/actions/queries/global_search_query'

type GlobalSearchDependencies = NonNullable<ConstructorParameters<typeof GlobalSearchQuery>[1]>
type GlobalSearchDependency<Key extends keyof GlobalSearchDependencies> = NonNullable<
  GlobalSearchDependencies[Key]
>

test.group('Unit | Search Global Search Query', () => {
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
    const listPublicTasks = rawListPublicTasks as unknown as GlobalSearchDependency<'listPublicTasks'>
    const rawListProjects = (_input: unknown, _execCtx: unknown) =>
      Promise.resolve({ data: [{ id: 'project-1' }] })
    const listProjects = rawListProjects as unknown as GlobalSearchDependency<'listProjects'>
    const rawListActiveSkillsCatalog = (_input: unknown) => Promise.resolve([{ id: 'skill-1' }])
    const listActiveSkillsCatalog = rawListActiveSkillsCatalog as unknown as GlobalSearchDependency<'listActiveSkillsCatalog'>
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

  test('skips all search sources for too-short queries without fanout', async ({ assert }) => {
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
      talents: 0,
      tasks: 0,
      projects: 0,
      skills: 0,
      organizations: 0,
      comments: 0,
    })
    assert.deepEqual(
      result.sourceStatuses.map((status) => status.status),
      ['skipped', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']
    )
    assert.isTrue(
      result.sourceStatuses.every(
        (status) =>
          status.resultCount === 0 &&
          status.durationMs === 0 &&
          status.errorMessage === 'Search query must be at least 2 characters'
      )
    )
    assert.equal(result.results.length, 0)
    assert.isTrue(completedChanges.some((entry) => entry.includes('"skipped":true')))
  })

  test('clamps long queries before source fanout to keep search bounded', async ({ assert }) => {
    const seenQueries: string[] = []
    const longQuery = `  ${'duyet '.repeat(80)}  `
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: ((input: { q: string }) => {
        seenQueries.push(input.q)
        return Promise.resolve([])
      }) as unknown as GlobalSearchDependency<'searchTalents'>,
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

  test('returns normalized search-center results with matched field context', async ({
    assert,
  }) => {
    const rawSearchTalents = () =>
      Promise.resolve([
        {
          id: 'user-1',
          username: 'duyet_talent',
          bio: 'Backend reviewer',
          custom_headline: 'Duyet platform engineer',
        },
      ])
    const rawListPublicTasks = () =>
      Promise.resolve({
        data: [
          {
            id: 'task-1',
            title: 'Review onboarding',
            description: 'Can duyet flow truoc khi ship',
            organization_name: 'Suar',
            project_name: 'Search Center',
          },
        ],
      })
    const rawListProjects = () =>
      Promise.resolve({
        data: [
          {
            id: 'project-1',
            name: 'Search Center',
            description: 'Du lieu duyet nam trong project description',
            organization_name: 'Suar',
          },
        ],
      })
    const rawListActiveSkillsCatalog = () =>
      Promise.resolve([
        {
          id: 'skill-1',
          skillName: 'Duyet quality',
          skillCode: 'duyet_quality',
          categoryCode: 'qa',
          description: 'Review rubric',
        },
      ])
    const rawSearchOrganizationsBasicList = () =>
      Promise.resolve([
        {
          id: 'organization-1',
          name: 'Duyet Lab',
          description: 'Search org',
          website: 'https://example.com',
        },
      ])
    const rawSearchTaskComments = () =>
      Promise.resolve([
        {
          id: 'comment-1',
          taskId: 'task-2',
          taskTitle: 'Ship search page',
          body: 'Duyet comment nay rieng voi task description',
          authorName: 'Reviewer',
          createdAt: '2026-07-13T00:00:00.000Z',
        },
      ])

    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: rawSearchTalents as unknown as GlobalSearchDependency<'searchTalents'>,
      listPublicTasks: rawListPublicTasks as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: rawListProjects as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: rawListActiveSkillsCatalog as GlobalSearchDependency<'listActiveSkillsCatalog'>,
      searchOrganizationsBasicList: rawSearchOrganizationsBasicList,
      searchTaskComments: rawSearchTaskComments,
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet')

    assert.isAtLeast(result.results.length, 6)
    assert.isTrue(
      result.results.some(
        (item) =>
          item.id === 'task:task-1:description' &&
          item.sourceLabel === 'Task description' &&
          item.url === '/tasks/task-1' &&
          item.snippets.includes('Can duyet flow truoc khi ship')
      )
    )
    assert.isTrue(
      result.results.some(
        (item) =>
          item.id === 'comment:comment-1' &&
          item.sourceLabel === 'Comment' &&
          item.url === '/tasks/task-2?comment=comment-1' &&
          item.matchedFields.includes('comment')
      )
    )
    assert.isTrue(result.results.some((item) => item.sourceLabel === 'Project description'))
  })

  test('ranks exact identity matches first and explains highlighted field matches', async ({
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
              id: 'task-description',
              title: 'Review onboarding',
              description: 'The duyet approval trail lives here.',
              organization_name: 'Suar',
              project_name: 'Quality OS',
            },
            {
              id: 'task-title',
              title: 'Duyet',
              description: 'Operational checklist.',
              organization_name: 'Suar',
              project_name: 'Quality OS',
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
        return Promise.resolve([
          {
            id: 'comment-1',
            taskId: 'task-comment',
            taskTitle: 'Comment thread',
            body: 'Duyet is mentioned in a later comment.',
            authorName: 'Reviewer',
            createdAt: '2026-07-13T00:00:00.000Z',
          },
        ])
      },
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet')

    const [first] = result.results
    assert.equal(first?.id, 'task:task-title:title')
    assert.equal(first?.matchStrength, 'exact')
    assert.equal(first?.rank, 1)
    assert.isAbove(first?.score ?? 0, 0)
    assert.deepEqual(first?.matchedFieldLabels, ['Task title'])
    assert.deepEqual(first?.breadcrumbs, ['Suar', 'Quality OS'])
    assert.equal(first?.primaryActionLabel, 'Open task')
    assert.equal(first?.secondaryMeta, 'Matched in Task title')
    assert.deepEqual(first?.highlightedSnippets[0], [{ text: 'Duyet', match: true }])

    const descriptionHit = result.results.find(
      (item) => item.id === 'task:task-description:description'
    )
    assert.equal(descriptionHit?.matchStrength, 'partial')
    assert.isBelow(descriptionHit?.score ?? 0, first?.score ?? 0)
    assert.deepEqual(descriptionHit?.matchedFieldLabels, ['Task description'])
    assert.deepEqual(calls, {
      talents: 1,
      tasks: 1,
      projects: 1,
      skills: 1,
      organizations: 1,
      comments: 1,
    })
  })

  test('aggregates multiple matched fields for the same entity without extra source calls', async ({
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
              id: 'task-multi',
              title: 'Duyet onboarding flow',
              description: 'Duyet acceptance notes and rollout details live here.',
              acceptance_criteria: 'Reviewer must approve before ship.',
              organization_name: 'Suar',
              project_name: 'Search Center',
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

    const taskHits = result.results.filter((item) => item.entityId === 'task-multi')
    assert.lengthOf(taskHits, 1)
    assert.deepEqual(taskHits[0]?.matchedFields, ['title', 'description'])
    assert.deepEqual(taskHits[0]?.matchedFieldLabels, ['Task title', 'Task description'])
    assert.lengthOf(taskHits[0]?.snippets ?? [], 2)
    assert.equal(taskHits[0]?.sourceLabel, 'Task title')
    assert.equal(taskHits[0]?.secondaryMeta, 'Matched in Task title, Task description')
    assert.isAbove(taskHits[0]?.score ?? 0, 1000)
    assert.deepEqual(calls, {
      talents: 1,
      tasks: 1,
      projects: 1,
      skills: 1,
      organizations: 1,
      comments: 1,
    })
  })

  test('caps combined ranked results while preserving per-source diagnostics', async ({
    assert,
  }) => {
    const makeTasks = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `task-${index + 1}`,
        title: `Duyet task ${index + 1}`,
        description: 'Bounded search payload',
      }))
    const makeProjects = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `project-${index + 1}`,
        name: `Duyet project ${index + 1}`,
        description: 'Bounded search payload',
      }))
    const makeComments = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `comment-${index + 1}`,
        taskId: `task-comment-${index + 1}`,
        taskTitle: `Commented task ${index + 1}`,
        body: `Duyet comment ${index + 1}`,
        authorName: 'Reviewer',
        createdAt: '2026-07-13T00:00:00.000Z',
      }))

    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: () => Promise.resolve([]),
      listPublicTasks: (() => Promise.resolve({ data: makeTasks(12) })) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() => Promise.resolve({ data: makeProjects(12) })) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: () => Promise.resolve([]),
      searchOrganizationsBasicList: () => Promise.resolve([]),
      searchTaskComments: () => Promise.resolve(makeComments(12)),
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet')

    assert.lengthOf(result.tasks, 12)
    assert.lengthOf(result.projects, 12)
    assert.lengthOf(result.comments, 12)
    assert.lengthOf(result.results, 24)
    assert.equal(result.resultLimit, 24)
    assert.equal(result.candidateResultCount, 36)
    assert.deepEqual(result.candidateTotalByType, {
      all: 36,
      talent: 0,
      task: 12,
      project: 12,
      skill: 0,
      organization: 0,
      comment: 12,
    })
    assert.deepInclude(result.candidateFieldFacets, {
      label: 'Task title',
      entityType: 'task',
      count: 12,
    })
    assert.deepInclude(result.candidateFieldFacets, {
      label: 'Project name',
      entityType: 'project',
      count: 12,
    })
    assert.deepInclude(result.candidateFieldFacets, {
      label: 'Comment',
      entityType: 'comment',
      count: 12,
    })
    assert.isTrue(result.resultsTruncated)
    assert.deepEqual(
      result.results.map((item) => item.rank),
      Array.from({ length: 24 }, (_, index) => index + 1)
    )
    assert.equal(result.sourceStatuses.find((status) => status.source === 'tasks')?.resultCount, 12)
    assert.equal(
      result.sourceStatuses.find((status) => status.source === 'projects')?.resultCount,
      12
    )
    assert.equal(
      result.sourceStatuses.find((status) => status.source === 'comments')?.resultCount,
      12
    )
  })

  test('matches and highlights Vietnamese text regardless of accents', async ({ assert }) => {
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: () => Promise.resolve([]),
      listPublicTasks: (() =>
        Promise.resolve({
          data: [
            {
              id: 'task-vietnamese',
              title: 'Duyệt hồ sơ ứng viên',
              description: 'Can duyet nhanh nhung van dung quy trinh.',
              organization_name: 'Suar',
              project_name: 'Vietnamese Search',
            },
          ],
        })) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() => Promise.resolve({ data: [] })) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: () => Promise.resolve([]),
      searchOrganizationsBasicList: () => Promise.resolve([]),
      searchTaskComments: () => Promise.resolve([]),
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet')

    const hit = result.results.find((item) => item.entityId === 'task-vietnamese')
    assert.exists(hit)
    assert.deepEqual(hit?.matchedFieldLabels, ['Task title', 'Task description'])
    assert.equal(hit?.matchStrength, 'strong')
    assert.deepEqual(hit?.highlightedSnippets[0], [
      { text: 'Duyệt', match: true },
      { text: ' hồ sơ ứng viên', match: false },
    ])
  })

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
    const eventNames: string[] = []
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          eventNames.push(event.event_name)
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
    assert.equal(talentStatus?.errorMessage, 'talent engine unavailable')
    assert.isAtLeast(talentStatus?.durationMs ?? 0, 0)
    const taskStatus = result.sourceStatuses.find((status) => status.source === 'tasks')
    assert.equal(taskStatus?.status, 'ok')
    assert.equal(taskStatus?.resultCount, 1)
    assert.equal(taskStatus?.errorMessage, null)
    assert.include(eventNames, 'search.query.completed')
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
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: {
        log: (_level, event) => {
          if (event.event_name === 'search.query.completed') {
            completedChanges.push(JSON.stringify(event.change ?? {}))
          }
        },
      },
      sourceTimeoutMs: 5,
      searchTalents: (() => {
        calls.talents += 1
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([{ id: 'late-talent' }])
          }, 50)
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
    assert.equal(talentStatus?.errorMessage, 'Search source timed out after 5ms')
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
