import { test } from '@japa/runner'

import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { TalentSearchDiscoveryDocument } from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_bindings'
import type { SearchDiscoveryResponse } from '#modules/search/public_contracts/search_discovery_contract'
import type { TalentDiscoveryReader } from '#modules/users/actions/ports/outbound/talent_discovery_reader'
import GetRecruitingTalentDiscoveryPageQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_discovery_page_query'

const execCtx: HttpActionContext = {
  userId: 'owner-1',
  organizationId: 'org-1',
  actorRoleSurface: 'org_owner',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
}

const document: TalentSearchDiscoveryDocument = {
  userId: 'talent-1',
  username: 'ada',
  displayName: 'Ada Lovelace',
  headline: 'Search engineer',
  bio: 'Builds discovery systems',
  skills: ['skill-search'],
  technologies: ['elasticsearch'],
  businessDomains: ['search-platform'],
  problemCategories: ['discovery'],
  taskTypes: ['backend'],
  trustScore: 0.9,
  completedTasks: 10,
  updatedAt: '2026-08-09T00:00:00.000Z',
}

function response(): SearchDiscoveryResponse<TalentSearchDiscoveryDocument> {
  return {
    context: 'talents.discovery.organization',
    schemaVersion: 1,
    canonicalCriteria: {
      context: 'talents.discovery.organization',
      schemaVersion: 1,
      sort: [],
      page: { size: 10 },
    },
    hits: [
      {
        id: 'talent:talent-1',
        entityType: 'talent',
        entityId: 'talent-1',
        source: 'talents',
        rank: 1,
        score: 1,
        document,
      },
    ],
    total: { value: 3, relation: 'eq' },
    facets: [
      {
        field: 'talent.businessDomains',
        countMode: 'constrained',
        values: [{ value: 'search-platform', count: 1, countRelation: 'exact', selected: false }],
      },
    ],
    suggestions: [],
    diagnostics: [],
    page: { nextCursor: 'next-opaque-cursor' },
    execution: { provider: 'elasticsearch', degraded: false, partial: false, requestId: 'request-1' },
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
      facets: [{ field: 'talent.businessDomains', state: 'authoritative', sources: ['talents'] }],
    },
  }
}

test.group('Recruiting Talent Discovery page query', () => {
  test('maps canonical hits and cursor metadata while preserving server context', async ({
    assert,
  }) => {
    const observed: unknown[] = []
    const reader: TalentDiscoveryReader = {
      read: (input) => {
        observed.push(input)
        return Promise.resolve(response())
      },
    }
    const query = new GetRecruitingTalentDiscoveryPageQuery(reader, execCtx)

    const result = await query.handle(
      {
        q: 'ada',
        page: 1,
        per_page: 10,
        sort_by: 'relevance',
        available_before: '2026-10-01',
        min_proficiency: 'l10',
      },
      'next-opaque-cursor'
    )

    assert.deepEqual(observed, [
      {
        input: {
          q: 'ada',
          page: 1,
          per_page: 10,
          available_before: '2026-10-01',
          min_proficiency: 'l10',
        },
        execCtx,
        cursor: 'next-opaque-cursor',
      },
    ])
    assert.deepEqual(result.talents[0], {
      id: 'talent-1',
      username: 'ada',
      status: 'active',
      trust_score: 0.9,
      completed_tasks: 10,
      custom_headline: 'Search engineer',
      bio: 'Builds discovery systems',
      bookmark: { id: null, isSaved: false, notes: null, folder: null, rating: null },
    })
    assert.equal(result.pagination.mode, 'cursor')
    assert.equal(result.pagination.cursor.nextCursor, 'next-opaque-cursor')
    assert.equal(result.total, 3)
    assert.deepEqual(result.search, response().search)
    assert.deepEqual(result.authority, response().authority)
    assert.deepEqual(result.facets, response().facets)
  })

  test('loads active skill options for the canonical multi-skill UI', async ({ assert }) => {
    const reader: TalentDiscoveryReader = {
      read: () => Promise.resolve(response()),
    }
    const directoryOptions = {
      execute: (organizationId: string) => {
        assert.equal(organizationId, 'org-1')
        return Promise.resolve({
          availableSkills: [
            { id: 'skill-a', skill_name: 'Skill A', category_code: 'technology', is_active: true },
          ],
          availableTasks: [{ id: 'task-1', title: 'Task 1' }],
        })
      },
    }
    const query = new GetRecruitingTalentDiscoveryPageQuery(
      reader,
      execCtx,
      undefined,
      directoryOptions
    )

    const result = await query.handle({ page: 1, per_page: 10 })

    assert.deepEqual(result.availableSkills, [
      { id: 'skill-a', skill_name: 'Skill A', category_code: 'technology', is_active: true },
    ])
    assert.deepEqual(result.availableTasks, [{ id: 'task-1', title: 'Task 1' }])
  })
})
