import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
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
  TASK_DISCOVERY_CONTEXTS,
  TASK_DISCOVERY_EXECUTION_PROFILE,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import { TaskDiscoveryPermissionProvider } from '#modules/tasks/public_contracts/task-discovery/task_discovery_permission_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

type TaskDiscoveryHit = ReturnType<typeof mapTaskSearchDiscoveryHit>

function selectedDifficulty(value: string): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field: 'task.difficulty',
    operator: 'eq',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  }
}

function criteria(filter: FilterExpression): QueryCriteriaRequest {
  return {
    context: TASK_DISCOVERY_CONTEXTS.public,
    schemaVersion: 1,
    filter,
    sort: [],
    page: { size: 20 },
    requestedFacets: [{ field: 'task.difficulty', countMode: 'self_excluding' }],
  }
}

function document(id: string, overrides: Partial<TaskSearchDocument> = {}): TaskSearchDocument {
  return {
    task_id: id,
    organization_id: 'org-public',
    creator_id: 'creator-tc-fst-008',
    project_id: 'project-tc-fst-008',
    title: `Task ${id}`,
    description: 'Selected-zero facet fixture',
    acceptance_criteria: 'The selected facet remains inspectable when no authorized result matches.',
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
    environment: 'test',
    application_deadline: null,
    due_date: null,
    created_at: '2026-08-10T00:00:00.000Z',
    estimated_users_affected: 1,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

test.group('Integration | TC-FST-008 selected-zero facet', (group) => {
  let client: Client
  let indexName: string
  let query: SearchDiscoveryQuery<TaskSearchDiscoveryDocument>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}tc_fst_008_${randomUUID().replaceAll('-', '')}`

    const population = [
      document('tc008-public-hard'),
      document('tc008-public-easy', { difficulty: 'easy' }),
      document('tc008-private-expert', {
        organization_id: 'org-private',
        difficulty: 'expert',
        task_visibility: 'internal',
        is_public: false,
        marketplace_visible: false,
        application_eligible: false,
      }),
    ]

    await client.indices.create({ index: indexName, mappings: TASK_SEARCH_INDEX_MAPPINGS })
    await client.bulk({
      refresh: true,
      operations: population.flatMap((current) => [
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
        secret: 'tc-fst-008-selected-zero-facet-secret',
        ttlMs: 60_000,
      }),
      rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
      resolveIndexGeneration: () => Promise.resolve(indexName),
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
      sessionIdGenerator: () => 'tc-fst-008-session',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('keeps a selected zero-count facet inspectable with an exact authorized relation', async ({
    assert,
  }) => {
    const filter = selectedDifficulty('expert')
    const result = await query.execute({
      request: {
        criteria: criteria(filter),
        search: { scope: 'task' },
      },
      principal: { kind: 'anonymous' },
      requestId: 'tc-fst-008-selected-zero',
    })

    assert.deepEqual(result.hits, [])
    assert.deepEqual(result.total, { value: 0, relation: 'eq' })
    assert.equal(result.search.inputMode, 'filter')
    assert.deepEqual(result.canonicalCriteria.filter, filter)
    assert.equal(result.authority.total.state, 'authoritative')
    assert.equal(
      result.authority.facets[0]?.state,
      'authoritative',
      JSON.stringify(result.authority.facets)
    )
    const facet = result.facets.find(({ field }) => field === 'task.difficulty')
    assert.isDefined(facet)
    assert.equal(facet?.countMode, 'self_excluding')
    assert.deepInclude(facet?.values ?? [], {
      value: 'expert',
      count: 0,
      countRelation: 'exact',
      selected: true,
    })
  }).timeout(20_000)
})
