import { test } from '@japa/runner'

import {
  type GlobalSearchDependencies,
  type GlobalSearchDependency,
} from '../support/global_search_query_test_support.js'

import { makeSystemHttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { GlobalSearchQuery } from '#modules/search/actions/queries/search-discovery/global_search_query'

test.group('Unit | Search Global Search Query - Ranking & Normalization', () => {
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
      listActiveSkillsCatalog:
        rawListActiveSkillsCatalog as GlobalSearchDependency<'listActiveSkillsCatalog'>,
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
    assert.equal(first?.rankingAlgorithm, 'weighted_rrf_v1')
    assert.isAbove(first?.rankingScore ?? 0, 0)
    assert.deepEqual(first?.rankingSignals, {
      textRank: 1,
      sourceRank: 2,
      textScore: first?.score,
    })
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

  test('uses weighted RRF to preserve provider rank when text scores tie', async ({ assert }) => {
    const dependencies: GlobalSearchDependencies = {
      operationalLogger: { log: () => {} },
      searchTalents: () => Promise.resolve([]),
      listPublicTasks: (() =>
        Promise.resolve({
          data: [
            {
              id: 'task-provider-rank-1',
              title: 'Zeta duyet workflow',
              description: 'Same text strength, higher provider rank.',
            },
            {
              id: 'task-provider-rank-2',
              title: 'Alpha duyet workflow',
              description: 'Same text strength, lower provider rank.',
            },
          ],
        })) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() =>
        Promise.resolve({ data: [] })) as unknown as GlobalSearchDependency<'listProjects'>,
      listActiveSkillsCatalog: () => Promise.resolve([]),
      searchOrganizationsBasicList: () => Promise.resolve([]),
      searchTaskComments: () => Promise.resolve([]),
    }

    const result = await new GlobalSearchQuery(
      makeSystemHttpActionContext('system-user'),
      dependencies
    ).handle('duyet')

    assert.deepEqual(
      result.results.map((item) => item.entityId),
      ['task-provider-rank-1', 'task-provider-rank-2']
    )
    assert.deepEqual(
      result.results.map((item) => item.rankingSignals?.sourceRank),
      [1, 2]
    )
    assert.isAbove(result.results[0]?.rankingScore ?? 0, result.results[1]?.rankingScore ?? 0)
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
      listPublicTasks: (() =>
        Promise.resolve({
          data: makeTasks(12),
        })) as unknown as GlobalSearchDependency<'listPublicTasks'>,
      listProjects: (() =>
        Promise.resolve({
          data: makeProjects(12),
        })) as unknown as GlobalSearchDependency<'listProjects'>,
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
    assert.lengthOf(result.results, 36)
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
    assert.isFalse(result.resultsTruncated)
    assert.deepEqual(
      result.results.map((item) => item.rank),
      Array.from({ length: 36 }, (_, index) => index + 1)
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
      listProjects: (() =>
        Promise.resolve({ data: [] })) as unknown as GlobalSearchDependency<'listProjects'>,
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
})
