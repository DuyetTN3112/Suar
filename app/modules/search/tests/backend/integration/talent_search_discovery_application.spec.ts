import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import type { TalentSearchDocument } from '#modules/search/domain/entity-search/talent_search_document'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import {
  mapTalentSearchDiscoveryHit,
  TALENT_SEARCH_DISCOVERY_BINDINGS,
  TALENT_SEARCH_DISCOVERY_ID_FIELD,
  TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
  TALENT_SEARCH_DISCOVERY_TEXT_FIELDS,
  type TalentSearchDiscoveryDocument,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_bindings'
import {
  TALENT_DISCOVERY_CONTEXTS,
  TALENT_DISCOVERY_EXECUTION_PROFILE,
  TalentDiscoveryFilterContextProvider,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_filter_context'
import { TalentDiscoveryPermissionProvider } from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_permission_provider'
import { TALENT_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

function condition(
  field: string,
  operator: string,
  value?: Extract<FilterExpression, { kind: 'condition' }>['value']
): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    ...(value === undefined ? {} : { value }),
  }
}

function criteria(overrides: Partial<QueryCriteriaRequest> = {}): QueryCriteriaRequest {
  return {
    context: TALENT_DISCOVERY_CONTEXTS.public,
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    ...overrides,
  }
}

function talent(id: string, overrides: Partial<TalentSearchDocument> = {}): TalentSearchDocument {
  return {
    user_id: id,
    username: id,
    display_name: `Talent ${id}`,
    headline: 'Search engineer',
    bio: 'Builds reliable discovery systems',
    status: 'active',
    is_searchable: true,
    is_active: true,
    skill_ids: ['skill-search'],
    skill_ids_known: true,
    skill_ids_count: 1,
    canonical_skill_ids: ['skills:skill-search'],
    canonical_skill_ids_known: true,
    canonical_skill_ids_count: 1,
    skill_evidence: [
      {
        skill_id: 'skill-search',
        proficiency_code: 'l10',
        proficiency_order: 11,
        source: 'reviewed',
        review_state: 'reviewed',
      },
    ],
    skill_evidence_known: true,
    skill_category_refs: ['skills:category-search'],
    skill_category_refs_known: true,
    skill_category_refs_count: 1,
    approved_skill_aliases_text: '',
    skill_taxonomy_versions: ['skills:1'],
    skill_assignment_provenance: ['explicit'],
    skill_assignment_review_states: ['reviewed'],
    skills_text: 'Search',
    accomplishments_text: 'Discovery platform',
    business_domains: ['search-platform'],
    business_domains_known: true,
    business_domains_count: 1,
    problem_categories: ['discovery'],
    problem_categories_known: true,
    problem_categories_count: 1,
    task_types: ['backend'],
    task_types_known: true,
    task_types_count: 1,
    technologies: ['elasticsearch'],
    technologies_known: true,
    technologies_count: 1,
    available_from: '2026-09-01',
    trust_score: 0.9,
    completed_tasks: 10,
    reviewed_skills_count: 2,
    imported_skills_count: 0,
    under_dispute_skills_count: 0,
    latest_confidence_signal: 'high',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

test.group('Integration | Talent Search Discovery application', (group) => {
  let client: Client
  let indexName: string
  let indexGeneration: string
  let cursorNow: Date
  let query: SearchDiscoveryQuery<TalentSearchDiscoveryDocument>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}talent_discovery_${randomUUID().replaceAll('-', '')}`
    indexGeneration = indexName
    cursorNow = new Date('2026-08-09T00:00:00.000Z')

    await client.indices.create({ index: indexName, mappings: TALENT_SEARCH_INDEX_MAPPINGS })
    const documents = [
      talent('talent-ada', {
        username: 'ada',
        display_name: 'Ada Lovelace',
        skill_ids: ['skill-search', 'skill-postgres'],
        skill_ids_count: 2,
        canonical_skill_ids: ['skills:skill-search', 'skills:skill-postgres'],
        canonical_skill_ids_count: 2,
        skills_text: 'Search PostgreSQL',
        business_domains: ['search-platform', 'fintech'],
        business_domains_count: 2,
        technologies: ['elasticsearch', 'postgres'],
        technologies_count: 2,
        updated_at: '2026-08-01T00:00:00.000Z',
      }),
      talent('talent-grace', {
        username: 'grace',
        display_name: 'Grace Hopper',
        skill_ids: ['skill-search', 'skill-design'],
        canonical_skill_ids: ['skills:skill-search', 'skills:skill-design'],
        skill_ids_count: 2,
        canonical_skill_ids_count: 2,
        skill_evidence: [
          {
            skill_id: 'skill-search',
            proficiency_code: 'l4',
            proficiency_order: 5,
            source: 'reviewed',
            review_state: 'reviewed',
          },
          {
            skill_id: 'skill-design',
            proficiency_code: 'l10',
            proficiency_order: 11,
            source: 'reviewed',
            review_state: 'reviewed',
          },
        ],
        skill_evidence_known: true,
        available_from: '2026-10-15',
        technologies: ['elasticsearch'],
        updated_at: '2026-08-02T00:00:00.000Z',
      }),
      talent('talent-private', {
        username: 'private',
        display_name: 'Private Talent',
        accomplishments_text: 'private incident token must never surface',
        is_searchable: false,
        updated_at: '2026-08-03T00:00:00.000Z',
      }),
      talent('talent-inactive', {
        username: 'inactive',
        display_name: 'Inactive Talent',
        status: 'inactive',
        is_active: false,
        updated_at: '2026-08-04T00:00:00.000Z',
      }),
      talent('talent-non-searchable', {
        username: 'hidden',
        display_name: 'Hidden Talent',
        is_searchable: false,
        updated_at: '2026-08-05T00:00:00.000Z',
      }),
    ]
    await client.bulk({
      refresh: true,
      operations: documents.flatMap((document) => [
        { index: { _index: indexName, _id: document.user_id } },
        document,
      ]),
    })

    const executor = new ElasticsearchFilterQueryExecutor<ReturnType<typeof mapTalentSearchDiscoveryHit>>({
      client,
      indexName,
      profile: TALENT_DISCOVERY_EXECUTION_PROFILE,
      bindings: TALENT_SEARCH_DISCOVERY_BINDINGS,
      idField: TALENT_SEARCH_DISCOVERY_ID_FIELD,
      textFields: TALENT_SEARCH_DISCOVERY_TEXT_FIELDS,
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp24c-talent-discovery-integration-cursor-secret',
        ttlMs: 60_000,
        clock: () => new Date(cursorNow),
      }),
      rankingVersion: TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
      resolveIndexGeneration: () => Promise.resolve(indexGeneration),
      mapHit: mapTalentSearchDiscoveryHit,
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
    })
    const executeFilter = new ExecuteFilterQuery({
      contextProvider: new TalentDiscoveryFilterContextProvider(),
      permissionProvider: new TalentDiscoveryPermissionProvider(),
      executorResolver: {
        getExecutor: (profile) =>
          profile === TALENT_DISCOVERY_EXECUTION_PROFILE ? executor : undefined,
      },
      timeoutMs: 10_000,
      hashGenerator: new NodeFilterHashGenerator(),
    })
    query = new SearchDiscoveryQuery<TalentSearchDiscoveryDocument>({
      verticals: [
        {
          scope: 'talent',
          source: 'talents',
          contexts: Object.values(TALENT_DISCOVERY_CONTEXTS),
          rankingVersion: TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
          supportedRetrievalModes: ['auto', 'lexical'],
          execute: (input) => executeFilter.execute(input),
        },
      ],
      sessionIdGenerator: () => 'wp24c-talent-session-generated-1',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('proves anonymous filter-only search, secondary labels, exact total, and exact facets', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('talent.businessDomains', 'contains_any', {
            kind: 'set',
            values: ['fintech'],
          }),
          requestedFacets: [{ field: 'talent.businessDomains', countMode: 'self_excluding' }],
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-filter-only',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['talent-ada'])
    assert.deepEqual(result.total, { value: 1, relation: 'eq' })
    assert.equal(result.search.inputMode, 'filter')
    assert.equal(result.authority.total.state, 'authoritative')
      assert.deepEqual(result.hits[0]?.document.businessDomains, ['search-platform', 'fintech'])
      const facet = result.facets.find(({ field }) => field === 'talent.businessDomains')
      assert.isDefined(facet)
      assert.deepInclude(facet?.values ?? [], {
        value: 'fintech',
        count: 1,
        countRelation: 'exact',
        selected: true,
      })
  })

  test('excludes private, inactive, and non-searchable talents from hits, totals, and facets', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          requestedFacets: [{ field: 'talent.businessDomains', countMode: 'constrained' }],
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-permission-scope',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId).sort(), [
      'talent-ada',
      'talent-grace',
    ])
    assert.deepEqual(result.total, { value: 2, relation: 'eq' })
    assert.equal(result.facets[0]?.values.find(({ value }) => value === 'search-platform')?.count, 2)
    assert.notInclude(JSON.stringify(result), 'talent-private')
    assert.notInclude(JSON.stringify(result), 'talent-inactive')
    assert.notInclude(JSON.stringify(result), 'talent-non-searchable')
  })

  test('requires all selected skills on the same talent and excludes cross-match candidates', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('talent.skills', 'contains_all', {
            kind: 'set',
            values: ['skill-search', 'skill-postgres'],
          }),
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-multi-skill-all',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['talent-ada'])
    assert.deepEqual(result.total, { value: 1, relation: 'eq' })
  })

      test('filters on canonical skill references without using display labels', async ({ assert }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('talent.canonicalSkills', 'contains_all', {
            kind: 'set',
            values: ['skills:skill-search', 'skills:skill-postgres'],
          }),
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp84-talent-canonical-skill-all',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['talent-ada'])
    assert.deepEqual(result.hits[0]?.document.canonicalSkills, [
      'skills:skill-search',
      'skills:skill-postgres',
    ])
    assert.deepEqual(result.hits[0]?.document.skillTaxonomyVersions, ['skills:1'])
    assert.deepEqual(result.hits[0]?.document.skillAssignmentProvenance, ['explicit'])
    assert.deepEqual(result.hits[0]?.document.skillAssignmentReviewStates, ['reviewed'])
  })

  test('filters availability by date and excludes unknown availability', async ({ assert }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('talent.availableFrom', 'before', {
            kind: 'scalar',
            value: '2026-10-01T00:00:00.000Z',
          }),
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp85-talent-availability-before',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['talent-ada'])
  })

  test('keeps skill and minimum proficiency on the same nested evidence object', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: {
            kind: 'condition',
            field: 'talent.skillEvidence',
            operator: 'related_matches',
            effect: 'require',
            unknown: 'exclude',
            value: {
              kind: 'relation',
              expression: {
                kind: 'group',
                combinator: 'and',
                children: [
                  {
                    kind: 'condition',
                    field: 'skillId',
                    operator: 'in',
                    effect: 'require',
                    unknown: 'exclude',
                    value: { kind: 'set', values: ['skill-search'] },
                  },
                  {
                    kind: 'condition',
                    field: 'proficiencyOrder',
                    operator: 'gte',
                    effect: 'require',
                    unknown: 'exclude',
                    value: { kind: 'scalar', value: 11 },
                  },
                ],
              },
            },
          },
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp86-talent-same-object-proficiency',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['talent-ada'])
  })

  test('applies the same privacy boundary for an organization recruiter with cursor and facets', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          context: TALENT_DISCOVERY_CONTEXTS.organization,
          filter: condition('talent.technologies', 'contains_any', {
            kind: 'set',
            values: ['elasticsearch'],
          }),
          requestedFacets: [{ field: 'talent.businessDomains', countMode: 'constrained' }],
          page: { size: 1 },
        }),
        search: { scope: 'talent' },
      },
      principal: {
        kind: 'user',
        id: 'recruiter-1',
        organizationId: 'org-1',
        organizationRole: 'org_admin',
      },
      requestId: 'wp24c-talent-organization-context',
    })

    assert.lengthOf(result.hits, 1)
    assert.deepEqual(result.total, { value: 2, relation: 'eq' })
    assert.isString(result.page.nextCursor)
    assert.equal(result.search.rankingVersion, TALENT_SEARCH_DISCOVERY_RANKING_VERSION)
    assert.notInclude(JSON.stringify(result), 'talent-private')
    assert.notInclude(JSON.stringify(result), 'talent-inactive')
    assert.notInclude(JSON.stringify(result), 'talent-non-searchable')
    assert.equal(result.authority.facets[0]?.state, 'authoritative')
  })

  test('does not disclose an exact private accomplishment term through search output', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          text: { value: 'private incident token' },
          requestedFacets: [{ field: 'talent.businessDomains', countMode: 'constrained' }],
        }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp29-private-accomplishment-term',
    })

    assert.deepEqual(result.hits, [])
    assert.deepEqual(result.total, { value: 0, relation: 'eq' })
    assert.notInclude(JSON.stringify(result.facets), 'private incident token')
    assert.notInclude(JSON.stringify(result), 'talent-private')
  })

  test('keeps the exact total and opaque cursor through page two', async ({ assert }) => {
    const first = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-page-1',
    })
    const cursor = first.page.nextCursor
    assert.deepEqual(first.total, { value: 2, relation: 'eq' })
    assert.lengthOf(first.hits, 1)
    assert.isString(cursor)
    if (cursor === undefined) throw new Error('Expected Talent page-two cursor')

    const second = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1, cursor } }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-page-2',
      searchSessionId: first.search.searchSessionId,
    })
    assert.deepEqual(second.total, { value: 2, relation: 'eq' })
    assert.lengthOf(second.hits, 1)
    assert.notEqual(second.hits[0]?.entityId, first.hits[0]?.entityId)
    assert.equal(second.search.searchSessionId, first.search.searchSessionId)
  })

  test('reports stale and expired cursors with diagnostics instead of restarting', async ({
    assert,
  }) => {
    cursorNow = new Date('2026-08-09T00:00:00.000Z')
    indexGeneration = indexName
    const first = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-expired-page-1',
    })
    const cursor = first.page.nextCursor
    if (cursor === undefined) throw new Error('Expected Talent expiry cursor')

    cursorNow = new Date(cursorNow.getTime() + 60_001)
    const expired = await query
      .execute({
        request: {
          criteria: criteria({ page: { size: 1, cursor } }),
          search: { scope: 'talent' },
        },
        principal: { kind: 'anonymous' },
        requestId: 'wp24c-talent-expired-page-2',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(expired, SearchDiscoveryError)
    assert.equal((expired as SearchDiscoveryError).code, 'SEARCH_CURSOR_EXPIRED')

    cursorNow = new Date('2026-08-09T00:00:00.000Z')
    const fresh = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'talent' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp24c-talent-stale-page-1',
    })
    const staleCursor = fresh.page.nextCursor
    if (staleCursor === undefined) throw new Error('Expected Talent stale cursor')
    indexGeneration = `${indexName}:cutover`
    const stale = await query
      .execute({
        request: {
          criteria: criteria({ page: { size: 1, cursor: staleCursor } }),
          search: { scope: 'talent' },
        },
        principal: { kind: 'anonymous' },
        requestId: 'wp24c-talent-stale-page-2',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(stale, SearchDiscoveryError)
    assert.equal((stale as SearchDiscoveryError).code, 'SEARCH_CURSOR_STALE')
    indexGeneration = indexName
  })
})
