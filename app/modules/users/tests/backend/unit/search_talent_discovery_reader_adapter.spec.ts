import { test } from '@japa/runner'

import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'
import { SearchTalentDiscoveryReaderAdapter } from '#modules/users/infra/adapters/talent/search_talent_discovery_reader_adapter'

const context: HttpActionContext = {
  userId: 'recruiter-1',
  organizationId: 'org-1',
  actorRoleSurface: 'org_admin',
  ip: '127.0.0.1',
  userAgent: 'test',
}

function response(): SearchDiscoveryResponse {
  return {
    context: 'talents.discovery.organization',
    schemaVersion: 1,
    canonicalCriteria: {
      context: 'talents.discovery.organization',
      schemaVersion: 1,
      sort: [],
      page: { size: 20 },
    },
    hits: [],
    total: { value: 0, relation: 'eq' },
    facets: [],
    suggestions: [],
    diagnostics: [],
    page: {},
    execution: { provider: 'test', degraded: false, partial: false, requestId: 'request-1' },
    search: {
      scope: 'talent',
      inputMode: 'browse',
      submittedQuery: '',
      normalizedQuery: '',
      retrievalMode: 'auto',
      rankingVersion: 'talents.lexical.v1',
      searchSessionId: 'session-1',
      requestId: 'request-1',
      diagnostics: [],
      sources: [],
    },
    authority: {
      hits: { state: 'authoritative', sources: ['talents'] },
      total: { state: 'authoritative', sources: ['talents'] },
      facets: [],
    },
  }
}

test.group('Search Talent discovery reader adapter', () => {
  test('passes server-resolved recruiter context and canonical request to Search API', async ({
    assert,
  }) => {
    const observed: unknown[] = []
    const expected = response()
    const adapter = new SearchTalentDiscoveryReaderAdapter({
      discover: <TDocument = Readonly<Record<string, unknown>>>(
        request: SearchDiscoveryRequest,
        execCtx: HttpActionContext,
        options?: { readonly signal?: AbortSignal; readonly searchSessionId?: string }
      ): Promise<SearchDiscoveryResponse<TDocument>> => {
        observed.push({ request, execCtx, options })
        return Promise.resolve(expected as unknown as SearchDiscoveryResponse<TDocument>)
      },
    })

    const result = await adapter.read({
      input: { q: 'platform', skill_ids: ['skill-search'], per_page: 5 },
      execCtx: context,
      searchSessionId: 'session-1',
    })

    assert.strictEqual(result, expected)
    assert.deepEqual(observed, [
      {
        request: {
          criteria: {
            context: 'talents.discovery.organization',
            schemaVersion: 1,
            text: { value: 'platform' },
            filter: {
              kind: 'condition',
              field: 'talent.skills',
              operator: 'contains_any',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['skill-search'] },
            },
            sort: [],
            requestedFacets: [
              { field: 'talent.skills', countMode: 'self_excluding' },
              { field: 'talent.businessDomains', countMode: 'self_excluding' },
              { field: 'talent.taskTypes', countMode: 'self_excluding' },
              { field: 'talent.problemCategories', countMode: 'self_excluding' },
              { field: 'talent.technologies', countMode: 'self_excluding' },
            ],
            page: { size: 5 },
          },
          search: { scope: 'talent', retrievalMode: 'auto' },
        },
        execCtx: context,
        options: { searchSessionId: 'session-1' },
      },
    ])
  })

  test('fails closed before calling Search API for anonymous, member, or missing-org actors', async ({
    assert,
  }) => {
    const calls: unknown[] = []
    const adapter = new SearchTalentDiscoveryReaderAdapter({
      discover: <TDocument = Readonly<Record<string, unknown>>>(): Promise<
        SearchDiscoveryResponse<TDocument>
      > => {
        calls.push(true)
        return Promise.resolve(response() as unknown as SearchDiscoveryResponse<TDocument>)
      },
    })
    const inputs: HttpActionContext[] = [
      { ...context, userId: null, organizationId: null, actorRoleSurface: null },
      { ...context, actorRoleSurface: 'org_member' },
      { ...context, organizationId: null },
    ]

    for (const execCtx of inputs) {
      await assert.rejects(() => adapter.read({ input: {}, execCtx }))
    }
    assert.deepEqual(calls, [])
  })
})
