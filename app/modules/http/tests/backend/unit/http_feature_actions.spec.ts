import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import RecordPlatformUiEventCommand from '#modules/http/actions/commands/search-discovery/record_platform_ui_event_command'
import RecordSearchUiEventCommand from '#modules/http/actions/commands/search-discovery/record_search_ui_event_command'
import type {
  HttpGlobalSearchOptions,
  HttpGlobalSearchResult,
} from '#modules/http/actions/dtos/global_search'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import GetOrganizationMembersQuery from '#modules/http/actions/queries/organization/get_organization_members_query'

const execCtx: HttpActionContext = {
  userId: 'user-1',
  organizationId: 'organization-1',
  ip: '127.0.0.1',
  userAgent: 'test-agent',
}

function emptySearchResult(query: string): HttpGlobalSearchResult {
  return {
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
  }
}

test.group('HTTP feature actions', () => {
  test('global search query delegates the HTTP-owned context and filter to its reader', async ({
    assert,
  }) => {
    const calls: Array<{
      query: string
      context: HttpActionContext
      options: HttpGlobalSearchOptions | undefined
    }> = []
    const expected = emptySearchResult('duyet')
    const query = new GetGlobalSearchQuery({
      search: (rawQuery, context, options) => {
        calls.push({ query: rawQuery, context, options })
        return Promise.resolve(expected)
      },
    })

    const result = await query.execute('duyet', execCtx, {
      entityTypes: ['task'],
    })

    assert.strictEqual(result, expected)
    assert.deepEqual(calls, [
      {
        query: 'duyet',
        context: execCtx,
        options: { entityTypes: ['task'] },
      },
    ])
  })

  test('organization-members query delegates without importing provider implementation', async ({
    assert,
  }) => {
    const calls: Array<{ organizationId: string; query?: string }> = []
    const expected = {
      organization: { id: 'organization-1', name: 'Suar' },
      members: [],
    }
    const query = new GetOrganizationMembersQuery({
      read: (organizationId, rawQuery) => {
        calls.push({
          organizationId,
          ...(rawQuery === undefined ? {} : { query: rawQuery }),
        })
        return Promise.resolve(expected)
      },
    })

    const result = await query.execute('organization-1', 'duyet')

    assert.strictEqual(result, expected)
    assert.deepEqual(calls, [{ organizationId: 'organization-1', query: 'duyet' }])
  })

  test('organization-members query preserves expected failures in its Result wrapper', async ({
    assert,
  }) => {
    const failure = new ForbiddenException('Membership access denied')
    const query = new GetOrganizationMembersQuery({
      read: () => Promise.reject(failure),
    })

    const result = await query.executeAndWrap('organization-1')

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
  })

  test('UI event commands preserve inputs and execution context at their outbound ports', async ({
    assert,
  }) => {
    const searchCalls: unknown[] = []
    const platformCalls: unknown[] = []
    const searchInput = { eventName: 'search.ui.submitted', surface: 'search_page' }
    const platformInput = {
      eventName: 'ui.event.occurred',
      module: 'tasks',
      subsystem: 'task_page',
      workflow: 'task_view',
      eventFamily: 'ui',
      surface: 'task_detail',
    }
    const searchCommand = new RecordSearchUiEventCommand({
      record: async (input, context) => {
        await Promise.resolve()
        searchCalls.push({ input, context })
      },
    })
    const platformCommand = new RecordPlatformUiEventCommand({
      record: async (input, context) => {
        await Promise.resolve()
        platformCalls.push({ input, context })
      },
    })

    await searchCommand.execute(searchInput, execCtx)
    await platformCommand.execute(platformInput, execCtx)

    assert.deepEqual(searchCalls, [{ input: searchInput, context: execCtx }])
    assert.deepEqual(platformCalls, [{ input: platformInput, context: execCtx }])
  })
})
