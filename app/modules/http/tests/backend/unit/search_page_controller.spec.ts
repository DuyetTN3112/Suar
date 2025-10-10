import { test } from '@japa/runner'

import SearchPageController from '#modules/http/controllers/search_page_controller'

test.group('Unit | HTTP Search Page Controller', () => {
  test('renders search page with normalized results and totals', async ({ assert }) => {
    const rendered: Array<{ component: string; props: unknown }> = []
    const calls: Array<{ query: string; options: unknown }> = []
    const controller = new SearchPageController({
      makeSearchQuery: () => ({
        handle: async (query: string, options?: unknown) => {
          await Promise.resolve()
          calls.push({ query, options })
          return {
            query,
            talents: [],
            tasks: [],
            projects: [],
            skills: [],
            organizations: [],
            comments: [],
            candidateResultCount: 3,
            candidateTotalByType: {
              all: 36,
              talent: 0,
              task: 12,
              project: 12,
              skill: 0,
              organization: 0,
              comment: 12,
            },
            candidateFieldFacets: [
              { label: 'Comment', entityType: 'comment' as const, count: 12 },
              { label: 'Project name', entityType: 'project' as const, count: 12 },
              { label: 'Task title', entityType: 'task' as const, count: 8 },
              { label: 'Task description', entityType: 'task' as const, count: 4 },
            ],
            resultLimit: 24,
            resultsTruncated: false,
            sourceStatuses: [
              {
                source: 'comments' as const,
                status: 'ok' as const,
                resultCount: 1,
                errorMessage: null,
                durationMs: 7,
              },
            ],
            results: [
              {
                id: 'comment:comment-1',
                entityType: 'comment' as const,
                entityId: 'comment-1',
                title: 'Ship search page',
                sourceLabel: 'Comment',
                url: '/tasks/task-1?comment=comment-1',
                matchedFields: ['comment'],
                matchedFieldLabels: ['Comment'],
                snippets: ['duyet comment'],
                highlightedSnippets: [
                  [
                    { text: 'duyet', match: true },
                    { text: ' comment', match: false },
                  ],
                ],
                breadcrumbs: ['Ship search page', 'Reviewer'],
                matchStrength: 'partial' as const,
                rank: 1,
                score: 510,
                primaryActionLabel: 'Open comment',
                secondaryMeta: 'Matched in Comment',
              },
              {
                id: 'task:task-1:description',
                entityType: 'task' as const,
                entityId: 'task-1',
                title: 'Review onboarding',
                sourceLabel: 'Task description',
                url: '/tasks/task-1',
                matchedFields: ['description'],
                matchedFieldLabels: ['Task description'],
                snippets: ['duyet task description'],
                highlightedSnippets: [
                  [
                    { text: 'duyet', match: true },
                    { text: ' task description', match: false },
                  ],
                ],
                breadcrumbs: ['Suar', 'Search Center'],
                matchStrength: 'partial' as const,
                rank: 2,
                score: 480,
                primaryActionLabel: 'Open task',
                secondaryMeta: 'Matched in Task description',
              },
              {
                id: 'task:task-2:title',
                entityType: 'task' as const,
                entityId: 'task-2',
                title: 'Duyet rollout',
                sourceLabel: 'Task title',
                url: '/tasks/task-2',
                matchedFields: ['title'],
                matchedFieldLabels: ['Task title'],
                snippets: ['Duyet rollout'],
                highlightedSnippets: [
                  [
                    { text: 'Duyet', match: true },
                    { text: ' rollout', match: false },
                  ],
                ],
                breadcrumbs: ['Suar', 'Search Center'],
                matchStrength: 'strong' as const,
                rank: 3,
                score: 700,
                primaryActionLabel: 'Open task',
                secondaryMeta: 'Matched in Task title',
              },
            ],
          }
        },
      }),
    })

    const ctx = {
      request: {
        input: (key: string) => {
          if (key === 'q') return 'duyet'
          if (key === 'type') return 'comment'
          if (key === 'field') return 'Task description'
          return undefined
        },
      },
      inertia: {
        render: (component: string, props: unknown) => {
          rendered.push({ component, props })
          return { component, props }
        },
      },
    }
    await controller.handle(ctx as never)

    assert.equal(rendered[0]?.component, 'search/index')
    assert.deepEqual(calls, [{ query: 'duyet', options: { entityTypes: ['comment'] } }])
    assert.deepEqual(rendered[0]?.props, {
      query: 'duyet',
      submittedQuery: 'duyet',
      activeType: 'comment',
      activeFieldLabel: 'Task description',
      results: [
        {
          id: 'comment:comment-1',
          entityType: 'comment',
          entityId: 'comment-1',
          title: 'Ship search page',
          sourceLabel: 'Comment',
          url: '/tasks/task-1?comment=comment-1',
          matchedFields: ['comment'],
          matchedFieldLabels: ['Comment'],
          snippets: ['duyet comment'],
          highlightedSnippets: [
            [
              { text: 'duyet', match: true },
              { text: ' comment', match: false },
            ],
          ],
          breadcrumbs: ['Ship search page', 'Reviewer'],
          matchStrength: 'partial',
          rank: 1,
          score: 510,
          primaryActionLabel: 'Open comment',
          secondaryMeta: 'Matched in Comment',
        },
        {
          id: 'task:task-1:description',
          entityType: 'task',
          entityId: 'task-1',
          title: 'Review onboarding',
          sourceLabel: 'Task description',
          url: '/tasks/task-1',
          matchedFields: ['description'],
          matchedFieldLabels: ['Task description'],
          snippets: ['duyet task description'],
          highlightedSnippets: [
            [
              { text: 'duyet', match: true },
              { text: ' task description', match: false },
            ],
          ],
          breadcrumbs: ['Suar', 'Search Center'],
          matchStrength: 'partial',
          rank: 2,
          score: 480,
          primaryActionLabel: 'Open task',
          secondaryMeta: 'Matched in Task description',
        },
        {
          id: 'task:task-2:title',
          entityType: 'task',
          entityId: 'task-2',
          title: 'Duyet rollout',
          sourceLabel: 'Task title',
          url: '/tasks/task-2',
          matchedFields: ['title'],
          matchedFieldLabels: ['Task title'],
          snippets: ['Duyet rollout'],
          highlightedSnippets: [
            [
              { text: 'Duyet', match: true },
              { text: ' rollout', match: false },
            ],
          ],
          breadcrumbs: ['Suar', 'Search Center'],
          matchStrength: 'strong',
          rank: 3,
          score: 700,
          primaryActionLabel: 'Open task',
          secondaryMeta: 'Matched in Task title',
        },
      ],
      totalByType: {
        all: 36,
        task: 12,
        project: 12,
        comment: 12,
        talent: 0,
        skill: 0,
        organization: 0,
      },
      fieldFacets: [
        { label: 'Comment', entityType: 'comment', count: 12 },
        { label: 'Project name', entityType: 'project', count: 12 },
        { label: 'Task title', entityType: 'task', count: 8 },
        { label: 'Task description', entityType: 'task', count: 4 },
      ],
      candidateResultCount: 3,
      resultLimit: 24,
      resultsTruncated: false,
      sourceStatuses: [
        { source: 'comments', status: 'ok', resultCount: 1, errorMessage: null, durationMs: 7 },
      ],
    })
  })

  test('drops stale field filters that do not exist in current results', async ({ assert }) => {
    const rendered: Array<{ component: string; props: Record<string, unknown> }> = []
    const controller = new SearchPageController({
      makeSearchQuery: () => ({
        handle: async (query: string) => {
          await Promise.resolve()
          return {
            query,
            talents: [],
            tasks: [],
            projects: [],
            skills: [],
            organizations: [],
            comments: [],
            candidateResultCount: 1,
            candidateTotalByType: {
              all: 1,
              talent: 0,
              task: 1,
              project: 0,
              skill: 0,
              organization: 0,
              comment: 0,
            },
            candidateFieldFacets: [{ label: 'Task title', entityType: 'task' as const, count: 1 }],
            resultLimit: 24,
            resultsTruncated: false,
            sourceStatuses: [],
            results: [
              {
                id: 'task:task-1:title',
                entityType: 'task' as const,
                entityId: 'task-1',
                title: 'Rollout task',
                sourceLabel: 'Task title',
                url: '/tasks/task-1',
                matchedFields: ['title'],
                matchedFieldLabels: ['Task title'],
                snippets: ['Rollout task'],
                highlightedSnippets: [[{ text: 'Rollout', match: true }]],
                breadcrumbs: ['Suar'],
                matchStrength: 'strong' as const,
                rank: 1,
                score: 700,
                primaryActionLabel: 'Open task',
                secondaryMeta: 'Matched in Task title',
              },
            ],
          }
        },
      }),
    })

    const ctx = {
      request: {
        input: (key: string) => {
          if (key === 'q') return 'rollout'
          if (key === 'field') return 'Organization website'
          return undefined
        },
      },
      inertia: {
        render: (component: string, props: Record<string, unknown>) => {
          rendered.push({ component, props })
          return { component, props }
        },
      },
    }
    await controller.handle(ctx as never)

    assert.equal(rendered[0]?.props['activeFieldLabel'], null)
    assert.deepEqual(rendered[0]?.props['fieldFacets'], [
      { label: 'Task title', entityType: 'task', count: 1 },
    ])
  })
})
