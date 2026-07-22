import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import {
  mapTaskSearchDiscoveryHit,
  TASK_SEARCH_DISCOVERY_BINDINGS,
  TASK_SEARCH_DISCOVERY_ID_FIELD,
  TASK_SEARCH_DISCOVERY_RANKING_VERSION,
  TASK_SEARCH_DISCOVERY_TEXT_FIELDS,
  type TaskSearchDiscoveryDocument,
} from '#modules/search/infra/adapters/entity-search/tasks/task_search_discovery_bindings'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import { TASK_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import {
  SearchDiscoveryError,
  type SearchDiscoveryHit,
} from '#modules/search/public_contracts/search_discovery_contract'
import {
  TASK_DISCOVERY_CONTEXTS,
  TASK_DISCOVERY_EXECUTION_PROFILE,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import { TaskDiscoveryPermissionProvider } from '#modules/tasks/public_contracts/task-discovery/task_discovery_permission_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

type TaskDiscoveryHit = SearchDiscoveryHit<TaskSearchDiscoveryDocument>

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
    context: TASK_DISCOVERY_CONTEXTS.public,
    schemaVersion: 1,
    sort: [],
    page: { size: 20 },
    ...overrides,
  }
}

function document(id: string, overrides: Partial<TaskSearchDocument> = {}): TaskSearchDocument {
  return {
    task_id: id,
    organization_id: 'org-public',
    creator_id: 'creator-public',
    project_id: 'project-search',
    title: `Task ${id}`,
    description: 'Authoritative discovery fixture',
    acceptance_criteria: 'Permission-safe totals and facets',
    context_background: null,
    required_skill_ids: ['skill-typescript'],
    required_skill_ids_known: true,
    required_skill_ids_count: 1,
    required_skill_category_codes: ['software-engineering'],
    required_skill_category_codes_known: true,
    required_skill_category_codes_count: 1,
    required_skills_text: 'TypeScript',
    canonical_term_ids: ['task-types:engineering'],
    canonical_term_ids_known: true,
    canonical_term_ids_count: 1,
    business_domains: ['software'],
    business_domains_coverage: 'complete',
    business_domains_known: true,
    business_domains_count: 1,
    problem_categories: ['search'],
    problem_categories_coverage: 'complete',
    problem_categories_known: true,
    problem_categories_count: 1,
    task_types: ['engineering'],
    task_types_coverage: 'complete',
    task_types_known: true,
    task_types_count: 1,
    difficulty: 'hard',
    status: 'todo',
    label: 'feature',
    priority: 'high',
    task_visibility: 'external',
    is_public: true,
    is_deleted: false,
    marketplace_visible: true,
    application_eligible: true,
    member_visible: true,
    assigned_to: null,
    verification_method: 'review',
    tech_stack: ['elasticsearch'],
    tech_stack_known: true,
    tech_stack_count: 1,
    domain_tags: ['discovery'],
    domain_tags_known: true,
    domain_tags_count: 1,
    learning_objectives: ['faceted-search'],
    learning_objectives_known: true,
    learning_objectives_count: 1,
    role_in_task: 'backend-engineer',
    autonomy_level: 'guided',
    collaboration_type: 'team',
    impact_scope: 'platform',
    environment: 'development',
    application_deadline: null,
    due_date: null,
    created_at: '2026-07-01T00:00:00.000Z',
    estimated_users_affected: 100,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

test.group('Integration | Search Discovery application', (group) => {
  let client: Client
  let indexName: string
  let indexGeneration: string
  let cursorNow: Date
  let query: SearchDiscoveryQuery<TaskSearchDiscoveryDocument>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}wp16_${randomUUID().replaceAll('-', '')}`
    indexGeneration = indexName
    cursorNow = new Date('2026-08-02T00:00:00.000Z')
    await client.indices.create({ index: indexName, mappings: TASK_SEARCH_INDEX_MAPPINGS })
    const documents = [
      document('task-postgres', {
        title: 'PostgreSQL Elasticsearch discovery',
        required_skill_ids: ['skill-postgresql', 'skill-typescript'],
        required_skill_ids_count: 2,
        required_skill_category_codes: ['database', 'software-engineering'],
        required_skill_category_codes_count: 2,
        required_skills_text: 'PostgreSQL TypeScript',
        canonical_term_ids: ['skills:skill-postgresql', 'technologies:postgresql'],
        canonical_term_ids_count: 2,
        business_domains: ['fintech', 'software'],
        business_domains_count: 2,
        domain_tags: ['payments', 'discovery'],
        domain_tags_count: 2,
        updated_at: '2026-08-02T00:00:00.000Z',
      }),
      document('task-redis', {
        title: 'Redis caching task',
        description: 'A newer task with only a weak PostgreSQL mention',
        required_skill_ids: ['skill-redis'],
        required_skill_ids_count: 1,
        required_skill_category_codes: ['database'],
        required_skill_category_codes_count: 1,
        required_skills_text: 'Redis',
        difficulty: 'easy',
        updated_at: '2026-08-03T12:00:00.000Z',
      }),
      document('task-private', {
        organization_id: 'org-private',
        title: 'Private PostgreSQL secret',
        required_skill_ids: ['skill-secret'],
        required_skills_text: 'secret',
        task_visibility: 'internal',
        is_public: false,
        marketplace_visible: false,
        application_eligible: false,
      }),
      document('task-deleted', {
        title: 'Deleted PostgreSQL secret',
        required_skill_ids: ['skill-secret-deleted'],
        required_skills_text: 'secret deleted',
        is_deleted: true,
        deleted_at: '2026-08-01T00:00:00.000Z',
      }),
      document('task-assigned', {
        title: 'Assigned PostgreSQL secret',
        required_skill_ids: ['skill-secret-assigned'],
        required_skills_text: 'secret assigned',
        assigned_to: 'worker-1',
        application_eligible: false,
      }),
      document('task-expired', {
        title: 'Expired public application window',
        application_deadline: '2000-01-01T00:00:00.000Z',
        updated_at: '2026-08-02T12:00:00.000Z',
      }),
      document('task-independent', {
        organization_id: null,
        creator_id: 'creator-independent',
        title: 'Independent public discovery task',
        required_skill_ids: ['skill-independent'],
        required_skill_ids_count: 1,
        required_skill_category_codes: ['independent-work'],
        required_skill_category_codes_count: 1,
        required_skills_text: 'Independent work',
        difficulty: 'medium',
        updated_at: '2026-08-01T18:00:00.000Z',
      }),
    ]
    await client.bulk({
      refresh: true,
      operations: documents.flatMap((current) => [
        { index: { _index: indexName, _id: current.task_id } },
        current,
      ]),
    })

    const executor = new ElasticsearchFilterQueryExecutor<TaskDiscoveryHit>({
      client,
      indexName,
      profile: TASK_DISCOVERY_EXECUTION_PROFILE,
      bindings: TASK_SEARCH_DISCOVERY_BINDINGS,
      idField: TASK_SEARCH_DISCOVERY_ID_FIELD,
      textFields: TASK_SEARCH_DISCOVERY_TEXT_FIELDS,
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'wp16-search-discovery-integration-cursor-secret',
        ttlMs: 60_000,
        clock: () => new Date(cursorNow),
      }),
      rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
      resolveIndexGeneration: () => Promise.resolve(indexGeneration),
      mapHit: mapTaskSearchDiscoveryHit,
      requestTimeoutMs: 5_000,
      pitKeepAlive: '1m',
    })
    const executeFilter = new ExecuteFilterQuery({
      contextProvider: new TaskDiscoveryFilterContextProvider(),
      permissionProvider: new TaskDiscoveryPermissionProvider(),
      executorResolver: {
        getExecutor: (profile) =>
          profile === TASK_DISCOVERY_EXECUTION_PROFILE ? executor : undefined,
      },
      timeoutMs: 10_000,
      hashGenerator: new NodeFilterHashGenerator(),
    })
    query = new SearchDiscoveryQuery({
      verticals: [
        {
          scope: 'task',
          source: 'tasks',
          contexts: Object.values(TASK_DISCOVERY_CONTEXTS),
          rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
          supportedRetrievalModes: ['auto', 'lexical'],
          execute: (input) => executeFilter.execute<TaskDiscoveryHit>(input),
        },
      ],
      sessionIdGenerator: () => 'wp16-session-generated-1',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('combines lexical retrieval, strict filters, permission-safe totals and facets', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          text: { value: 'PostgreSQL' },
          filter: condition('taxonomy.requiredSkills', 'contains_any', {
            kind: 'set',
            values: ['skill-postgresql'],
          }),
          requestedFacets: [{ field: 'taxonomy.requiredSkills', countMode: 'self_excluding' }],
        }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-combined',
    })

    assert.deepEqual(
      result.hits.map(({ entityId }) => entityId),
      ['task-postgres']
    )
    assert.deepEqual(result.total, { value: 1, relation: 'eq' })
    // The real Elasticsearch mapper supplies score/document only. Search must not manufacture
    // an explanation from either; provider evidence is required by the contract.
    assert.isUndefined(result.hits[0]?.explanation)
    assert.equal(result.authority.total.state, 'authoritative')
    assert.notInclude(JSON.stringify(result.facets), 'skill-secret')
    assert.isTrue(
      result.facets[0]?.values.some(
        ({ value, count }) => value === 'skill-typescript' && count === 1
      )
    )
  })

  test('ranks a stronger older lexical match above a newer weak match', async ({ assert }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({ text: { value: 'PostgreSQL Elasticsearch discovery' } }),
        search: { scope: 'task', retrievalMode: 'lexical' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-lexical-relevance-before-freshness',
    })

    const rankedIds = result.hits.map(({ entityId }) => entityId)
    assert.equal(rankedIds[0], 'task-postgres')
    assert.isBelow(rankedIds.indexOf('task-postgres'), rankedIds.indexOf('task-redis'))
    assert.equal(result.search.retrievalMode, 'lexical')
  })

  test('filters and facets by namespaced canonical taxonomy terms', async ({ assert }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('taxonomy.canonicalTerms', 'contains_any', {
            kind: 'set',
            values: ['technologies:postgresql'],
          }),
          requestedFacets: [
            { field: 'taxonomy.canonicalTerms', countMode: 'self_excluding' },
          ],
        }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-canonical-namespace-filter',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId), ['task-postgres'])
    assert.deepEqual(result.total, { value: 1, relation: 'eq' })
    assert.isTrue(
      result.facets[0]?.values.some(
        ({ value, count }) => value === 'technologies:postgresql' && count === 1
      )
    )
  })

  test('keeps preferences inside ranking while strict clauses retain eligibility authority', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          text: { value: 'discovery' },
          filter: condition('taxonomy.requiredSkills', 'contains_any', {
            kind: 'set',
            values: ['skill-postgresql', 'skill-independent'],
          }),
          preferences: [
            {
              effect: 'prefer',
              weight: 10,
              expression: condition('task.difficulty', 'eq', {
                kind: 'scalar',
                value: 'medium',
              }),
            },
          ],
        }),
        search: { scope: 'task' },
      },
      principal: { kind: 'user', id: 'public-search-user' },
      requestId: 'wp16-strict-plus-preference',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId).sort(), [
      'task-independent',
      'task-postgres',
    ])
    assert.equal(result.hits[0]?.entityId, 'task-independent')
    assert.deepEqual(result.total, { value: 2, relation: 'eq' })
    assert.equal(result.search.inputMode, 'combined')
    assert.lengthOf(result.canonicalCriteria.preferences ?? [], 1)
  })

  test('supports filter-only multi-label recall and selected-zero facets', async ({ assert }) => {
    for (const skillId of ['skill-postgresql', 'skill-typescript']) {
      const result = await query.execute({
        request: {
          criteria: criteria({
            filter: condition('taxonomy.requiredSkills', 'contains_any', {
              kind: 'set',
              values: [skillId],
            }),
          }),
          search: { scope: 'task' },
        },
        principal: { kind: 'anonymous' },
        requestId: `wp16-multi-label-${skillId}`,
      })
      assert.deepEqual(
        result.hits.map(({ entityId }) => entityId),
        ['task-postgres']
      )
      assert.equal(result.search.inputMode, 'filter')
    }

    const zero = await query.execute({
      request: {
        criteria: criteria({
          filter: condition('task.difficulty', 'eq', {
            kind: 'scalar',
            value: 'expert',
          }),
          requestedFacets: [{ field: 'task.difficulty', countMode: 'self_excluding' }],
        }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-selected-zero',
    })
    assert.deepEqual(zero.total, { value: 0, relation: 'eq' })
    assert.deepInclude(zero.facets[0]?.values ?? [], {
      value: 'expert',
      count: 0,
      countRelation: 'exact',
      selected: true,
    })
  })

  test('excludes expired application windows while retaining open-ended public tasks', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria(),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-public-application-window',
    })

    assert.deepEqual(result.hits.map(({ entityId }) => entityId).sort(), [
      'task-independent',
      'task-postgres',
      'task-redis',
    ])
    assert.deepEqual(result.total, { value: 3, relation: 'eq' })
    assert.notInclude(JSON.stringify(result), 'task-expired')
  })

  test('computes exact facets from the complete population rather than the returned page', async ({
    assert,
  }) => {
    const result = await query.execute({
      request: {
        criteria: criteria({
          page: { size: 1 },
          requestedFacets: [{ field: 'task.difficulty', countMode: 'constrained' }],
        }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-complete-facet-population',
    })

    assert.lengthOf(result.hits, 1)
    assert.deepEqual(result.total, { value: 3, relation: 'eq' })
    assert.deepEqual(
      result.facets[0]?.values.map(({ value, count, countRelation }) => ({
        value,
        count,
        countRelation,
      })),
      [
        { value: 'easy', count: 1, countRelation: 'exact' },
        { value: 'hard', count: 1, countRelation: 'exact' },
        { value: 'medium', count: 1, countRelation: 'exact' },
      ]
    )
  })

  test('keeps complete totals and opaque cursor valid through orchestration page two', async ({
    assert,
  }) => {
    const first = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-page-1',
      searchSessionId: 'wp16-session-continued-1',
    })
    assert.deepEqual(first.total, { value: 3, relation: 'eq' })
    assert.lengthOf(first.hits, 1)
    assert.isAbove(first.page.nextCursor?.length ?? 0, 512)
    const nextCursor = first.page.nextCursor
    if (nextCursor === undefined) throw new Error('Expected an opaque second-page cursor')

    const second = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1, cursor: nextCursor } }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-page-2',
      searchSessionId: first.search.searchSessionId,
    })
    assert.deepEqual(second.total, { value: 3, relation: 'eq' })
    assert.lengthOf(second.hits, 1)
    assert.notEqual(second.hits[0]?.entityId, first.hits[0]?.entityId)
    assert.equal(second.search.searchSessionId, first.search.searchSessionId)
  })

  test('reports expired and generation-stale cursors without silently restarting', async ({
    assert,
  }) => {
    const first = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-cursor-fault-page-1',
    })
    const cursor = first.page.nextCursor
    if (cursor === undefined) throw new Error('Expected cursor fault fixture')

    const tamperedCursor = `${cursor.slice(0, -1)}${cursor.endsWith('x') ? 'y' : 'x'}`
    const tampered = await query
      .execute({
        request: {
          criteria: criteria({ page: { size: 1, cursor: tamperedCursor } }),
          search: { scope: 'task' },
        },
        principal: { kind: 'anonymous' },
        requestId: 'wp16-cursor-tampered',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(tampered, SearchDiscoveryError)
    assert.equal((tampered as SearchDiscoveryError).code, 'SEARCH_CURSOR_INVALID')

    cursorNow = new Date(cursorNow.getTime() + 60_001)
    const expired = await query
      .execute({
        request: {
          criteria: criteria({ page: { size: 1, cursor } }),
          search: { scope: 'task' },
        },
        principal: { kind: 'anonymous' },
        requestId: 'wp16-cursor-expired',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(expired, SearchDiscoveryError)
    assert.equal((expired as SearchDiscoveryError).code, 'SEARCH_CURSOR_EXPIRED')

    const fresh = await query.execute({
      request: {
        criteria: criteria({ page: { size: 1 } }),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'wp16-cursor-stale-page-1',
    })
    const staleCursor = fresh.page.nextCursor
    if (staleCursor === undefined) throw new Error('Expected stale cursor fixture')
    indexGeneration = `${indexName}:cutover`
    const stale = await query
      .execute({
        request: {
          criteria: criteria({ page: { size: 1, cursor: staleCursor } }),
          search: { scope: 'task' },
        },
        principal: { kind: 'anonymous' },
        requestId: 'wp16-cursor-stale',
      })
      .catch((error: unknown) => error)
    assert.instanceOf(stale, SearchDiscoveryError)
    assert.equal((stale as SearchDiscoveryError).code, 'SEARCH_CURSOR_STALE')

    indexGeneration = indexName
  })

  test('enforces owner-wide versus member own-or-assigned organization scope', async ({
    assert,
  }) => {
    const discover = (id: string, organizationRole: OrganizationRole) =>
      query.execute({
        request: {
          criteria: criteria({ context: TASK_DISCOVERY_CONTEXTS.member }),
          search: { scope: 'task' },
        },
        principal: {
          kind: 'user',
          id,
          organizationId: 'org-public',
          organizationRole,
        },
        requestId: `wp16-member-${id}`,
      })

    const creator = await discover('creator-public', OrganizationRole.MEMBER)
    const assignee = await discover('worker-1', OrganizationRole.MEMBER)
    const unrelated = await discover('unrelated-member', OrganizationRole.MEMBER)
    const owner = await discover('owner-1', OrganizationRole.OWNER)

    assert.deepEqual(creator.hits.map(({ entityId }) => entityId).sort(), [
      'task-assigned',
      'task-expired',
      'task-postgres',
      'task-redis',
    ])
    assert.deepEqual(
      assignee.hits.map(({ entityId }) => entityId),
      ['task-assigned']
    )
    assert.deepEqual(unrelated.total, { value: 0, relation: 'eq' })
    assert.deepEqual(owner.total, { value: 4, relation: 'eq' })
    assert.notInclude(JSON.stringify(owner), 'task-deleted')
    assert.notInclude(JSON.stringify(owner), 'task-private')
  })
})
