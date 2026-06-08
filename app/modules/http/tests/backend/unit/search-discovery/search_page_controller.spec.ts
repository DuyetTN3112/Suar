import { test } from '@japa/runner'

import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetSearchDiscoveryQuery from '#modules/http/actions/queries/search-discovery/get_search_discovery_query'
import SearchPageController from '#modules/http/controllers/search-discovery/search_page_controller'
import {
  SearchDiscoveryError,
  type SearchDiscoveryDiagnosticCode,
} from '#modules/search/public_contracts/search_discovery_contract'

test.group('Unit | HTTP Search Page Controller', () => {
  test('keeps search in the selected project before considering the organization shell', async ({
    assert,
  }) => {
    let redirectedTo: string | undefined
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({
        search: () => Promise.reject(new Error('Search must not execute before shell redirect')),
      })
    )

    const ctx = {
      auth: { user: { id: 'owner-1' } },
      currentOrganizationId: 'organization-1',
      currentOrganizationRole: 'org_owner',
      session: { get: (key: string) => (key === 'current_project_id' ? 'project-1' : undefined) },
      request: {
        input: (key: string) => ({ q: 'duy', type: 'talent' })[key],
        url: () => '/search?q=duy&type=talent',
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      response: { redirect: (url: string) => { redirectedTo = url } },
    }
    await controller.handle(ctx as never)

    assert.equal(redirectedTo, '/projects/project-1/search?q=duy&type=talent')
  })

  test('moves organization managers from the personal Search URL to the organization shell', async ({
    assert,
  }) => {
    let redirectedTo: string | undefined
    const controller = new SearchPageController(
      new GetGlobalSearchQuery({
        search: () => Promise.reject(new Error('Search must not execute before shell redirect')),
      })
    )

    const ctx = {
      auth: { user: { id: 'owner-1' } },
      currentOrganizationId: 'organization-1',
      currentOrganizationRole: 'org_owner',
      session: { get: () => undefined },
      request: {
        input: (key: string) =>
          ({
            q: 'duy',
            type: 'talent',
            field: 'Talent name',
            cursor: 'page-2',
            previousCursor: 'page-1',
          })[key],
        url: () => '/search?q=duy&type=talent',
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
      },
      response: { redirect: (url: string) => { redirectedTo = url } },
    }
    await controller.handle(ctx as never)

    assert.equal(
      redirectedTo,
      '/org/search?q=duy&type=talent&field=Talent+name&cursor=page-2&previousCursor=page-1'
    )
  })

  test('renders search page with normalized results and totals', async ({ assert }) => {
    const rendered: Array<{ component: string; props: unknown }> = []
    const calls: Array<{ query: string; options: unknown }> = []
    const search = new GetGlobalSearchQuery({
      search: async (query, _execCtx, options) => {
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
    })
    const controller = new SearchPageController(search)

    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'organization-1',
      request: {
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
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
      shareTargets: [{ type: 'organization', id: 'organization-1', label: 'Current organization' }],
      savedViewContextKey: 'search.blended.global',
      savedViewContextOwner: 'search',
      savedViewCapabilities: { sharedViews: true, alerts: false },
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
    const search = new GetGlobalSearchQuery({
      search: async (query) => {
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
    })
    const controller = new SearchPageController(search)

    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'organization-1',
      request: {
        ip: () => '127.0.0.1',
        header: () => 'test-agent',
        input: (key: string) => {
          if (key === 'q') return 'rollout'
          if (key === 'type') return 'task'
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
    assert.equal(rendered[0]?.props['savedViewContextKey'], 'tasks.discovery.member')
    assert.equal(rendered[0]?.props['savedViewContextOwner'], 'tasks')
    assert.deepEqual(rendered[0]?.props['savedViewCapabilities'], {
      sharedViews: true,
      alerts: true,
    })
    assert.deepEqual(rendered[0]?.props['fieldFacets'], [
      { label: 'Task title', entityType: 'task', count: 1 },
    ])
  })

  test('renders a fail-closed page for an invalid, expired, or stale cursor without fallback', async ({
    assert,
  }) => {
    const cursorCodes: SearchDiscoveryDiagnosticCode[] = [
      'SEARCH_CURSOR_INVALID',
      'SEARCH_CURSOR_EXPIRED',
      'SEARCH_CURSOR_STALE',
    ]

    for (const code of cursorCodes) {
      const rendered: Array<{ component: string; props: Record<string, unknown> }> = []
      let legacyFallbackCalls = 0
      const controller = new SearchPageController(
        new GetGlobalSearchQuery({
          search: () => {
            legacyFallbackCalls += 1
            return Promise.reject(new Error('legacy fallback must not run for cursor failures'))
          },
        }),
        new GetSearchDiscoveryQuery({
          discover: () => Promise.reject(new SearchDiscoveryError(code)),
        })
      )

      // The controller test supplies only the HTTP members used by this boundary.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await controller.handle({
        auth: { user: { id: 'user-1' } },
        currentOrganizationId: null,
        session: { get: () => undefined },
        request: {
          input: (key: string) => ({ q: 'checkout', type: 'task', cursor: 'opaque-page-2' })[key],
          ip: () => '127.0.0.1',
          header: () => 'test-agent',
        },
        inertia: {
          render: (component: string, props: Record<string, unknown>) => {
            rendered.push({ component, props })
            return { component, props }
          },
        },
      } as never)

      assert.equal(legacyFallbackCalls, 0)
      assert.equal(rendered[0]?.component, 'search/index')
      assert.deepEqual(rendered[0]?.props['discoveryFailure'], { code })
      assert.deepEqual(rendered[0]?.props['results'], [])
      assert.isUndefined(rendered[0]?.props['discovery'])
      assert.equal(rendered[0]?.props['cursor'], 'opaque-page-2')
    }
  })

  test('fails closed instead of restarting a cursor page when Discovery is degraded', async ({
    assert,
  }) => {
    const degradedCodes: SearchDiscoveryDiagnosticCode[] = [
      'SEARCH_SOURCE_UNAVAILABLE',
      'SEARCH_SOURCE_TIMED_OUT',
      'SEARCH_INDEX_STALE',
    ]

    for (const code of degradedCodes) {
      const rendered: Array<{ component: string; props: Record<string, unknown> }> = []
      let legacyFallbackCalls = 0
      const controller = new SearchPageController(
        new GetGlobalSearchQuery({
          search: (query) => {
            legacyFallbackCalls += 1
            return Promise.resolve({
              query,
              talents: [],
              tasks: [],
              projects: [],
              skills: [],
              organizations: [],
              comments: [],
              results: [],
              candidateResultCount: 0,
              candidateTotalByType: {
                all: 0,
                talent: 0,
                task: 0,
                project: 0,
                skill: 0,
                organization: 0,
                comment: 0,
              },
              candidateFieldFacets: [],
              resultLimit: 24,
              resultsTruncated: false,
              sourceStatuses: [],
            })
          },
        }),
        new GetSearchDiscoveryQuery({
          discover: () => Promise.reject(new SearchDiscoveryError(code)),
        })
      )

      // The controller test supplies only the HTTP members used by this boundary.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await controller.handle({
        auth: { user: { id: 'user-1' } },
        currentOrganizationId: null,
        session: { get: () => undefined },
        request: {
          input: (key: string) => ({ q: 'checkout', type: 'task', cursor: 'opaque-page-2' })[key],
          ip: () => '127.0.0.1',
          header: () => 'test-agent',
        },
        inertia: {
          render: (component: string, props: Record<string, unknown>) => {
            rendered.push({ component, props })
            return { component, props }
          },
        },
      } as never)

      assert.equal(legacyFallbackCalls, 0)
      assert.equal(rendered[0]?.component, 'search/index')
      assert.deepEqual(rendered[0]?.props['discoveryFailure'], { code })
      assert.deepEqual(rendered[0]?.props['results'], [])
      assert.equal(rendered[0]?.props['cursor'], 'opaque-page-2')
      assert.notInclude(JSON.stringify(rendered[0]?.props), 'elasticsearch')
    }
  })
})
