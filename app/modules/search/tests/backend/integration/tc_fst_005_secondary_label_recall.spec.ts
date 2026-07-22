import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  createSavedFilterView,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
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
type SavedSemanticState = {
  filter: FilterExpression | null
  textQuery: string | null
  sort: readonly { field: string; direction: 'asc' | 'desc' }[]
  projection: readonly string[]
}

const SECONDARY_LABEL_CASES = [
  {
    field: 'taxonomy.requiredSkills',
    sourceKey: 'required_skill_ids',
    documentKey: 'requiredSkillIds',
    label: 'skill-secondary',
  },
  {
    field: 'taxonomy.domainTags',
    sourceKey: 'domain_tags',
    documentKey: 'domainTags',
    label: 'tag-secondary',
  },
  {
    field: 'taxonomy.problemCategories',
    sourceKey: 'problem_categories',
    documentKey: 'problemCategories',
    label: 'classification-secondary',
  },
] as const

function condition(field: string, value: string): Extract<FilterExpression, { kind: 'condition' }> {
  return {
    kind: 'condition',
    field,
    operator: 'contains_any',
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'set', values: [value] },
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
    organization_id: null,
    creator_id: 'creator-tc-fst-005',
    project_id: 'project-tc-fst-005',
    title: `Task ${id}`,
    description: 'The secondary taxonomy label is absent from free text.',
    acceptance_criteria: 'Return the authorized task and its selected facet.',
    context_background: null,
    required_skill_ids: ['skill-primary'],
    required_skill_ids_known: true,
    required_skill_ids_count: 1,
    required_skill_category_codes: ['category-primary'],
    required_skill_category_codes_known: true,
    required_skill_category_codes_count: 1,
    required_skills_text: 'Primary skill',
    business_domains: ['domain-primary'],
    business_domains_coverage: 'complete',
    business_domains_known: true,
    business_domains_count: 1,
    problem_categories: ['classification-primary'],
    problem_categories_coverage: 'complete',
    problem_categories_known: true,
    problem_categories_count: 1,
    task_types: ['type-primary'],
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
    domain_tags: ['tag-primary'],
    domain_tags_known: true,
    domain_tags_count: 1,
    learning_objectives: ['taxonomy-recall'],
    learning_objectives_known: true,
    learning_objectives_count: 1,
    canonical_term_ids: ['task-types:primary'],
    canonical_term_ids_known: true,
    canonical_term_ids_count: 1,
    role_in_task: 'backend-engineer',
    autonomy_level: 'guided',
    collaboration_type: 'team',
    impact_scope: 'platform',
    environment: 'test',
    application_deadline: null,
    due_date: null,
    created_at: '2026-08-01T00:00:00.000Z',
    estimated_users_affected: 1,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

function savedViewFor(filter: FilterExpression, id: string) {
  return createSavedFilterView(
    {
      id,
      name: 'Secondary taxonomy recall',
      description: null,
      ownerId: 'user-tc-fst-005',
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context: { key: TASK_DISCOVERY_CONTEXTS.public, owner: 'tasks', schemaVersion: 1 },
      semanticState: { filter, textQuery: null, sort: [], projection: [] },
      presentationState: { layout: 'list' },
      isDefault: false,
      isPinned: false,
      alertState: { status: 'disabled', reason: null },
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
      lastSuccessfulMigrationVersion: 1,
    },
    {},
    new NodeFilterHashGenerator()
  ) as unknown as { semanticState: SavedSemanticState }
}

test.group('Integration | TC-FST-005 secondary label recall', (group) => {
  let client: Client
  let indexName: string
  let population: readonly TaskSearchDocument[]
  let query: SearchDiscoveryQuery<TaskSearchDiscoveryDocument>

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required')
    indexName = `${prefix}tc_fst_005_${randomUUID().replaceAll('-', '')}`

    population = [
      document('task-secondary-label', {
        required_skill_ids: ['skill-primary', 'skill-secondary'],
        required_skill_ids_count: 2,
        domain_tags: ['tag-primary', 'tag-secondary'],
        domain_tags_count: 2,
        problem_categories: ['classification-primary', 'classification-secondary'],
        problem_categories_count: 2,
      }),
      document('task-primary-only'),
    ]

    await client.indices.create({ index: indexName, mappings: TASK_SEARCH_INDEX_MAPPINGS })
    await client.bulk({
      refresh: true,
      operations: population.flatMap((current) => [
        { index: { _index: indexName, _id: current.task_id } },
        current,
      ]),
    })

    const executor = new ElasticsearchFilterQueryExecutor<ReturnType<typeof mapTaskSearchDiscoveryHit>>({
      client,
      indexName,
      profile: TASK_DISCOVERY_EXECUTION_PROFILE,
      bindings: TASK_SEARCH_DISCOVERY_BINDINGS,
      idField: TASK_SEARCH_DISCOVERY_ID_FIELD,
      textFields: TASK_SEARCH_DISCOVERY_TEXT_FIELDS,
      cursorCodec: new ElasticsearchCursorCodec({
        secret: 'tc-fst-005-secondary-label-secret',
        ttlMs: 60_000,
      }),
      rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
      resolveIndexGeneration: () => Promise.resolve(indexName),
      mapHit: mapTaskSearchDiscoveryHit,
      requestTimeoutMs: 5_000,
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
      sessionIdGenerator: () => 'tc-fst-005-session',
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: indexName }, { ignore: [404] })
    await teardownApp()
  })

  test('recalls each secondary skill/tag/classification through real ES, facets, and saved criteria', async ({
    assert,
  }) => {
    for (const current of SECONDARY_LABEL_CASES) {
      const filter = condition(current.field, current.label)
      const savedView = savedViewFor(filter, `view-${current.label}`)
      const serializedState = serializeSavedFilterSemanticState(savedView.semanticState) as unknown as string
      const persistedSemanticState = parseSavedFilterSemanticState(
        serializedState
      ) as unknown as SavedSemanticState
      const savedFilter = persistedSemanticState.filter
      if (savedFilter === null) throw new Error('Expected a saved secondary-label filter')

      const result = await query.execute({
        request: {
          criteria: criteria({
            filter: savedFilter,
            requestedFacets: [{ field: current.field, countMode: 'constrained' }],
          }),
          search: { scope: 'task' },
        },
        principal: { kind: 'anonymous' },
        requestId: `tc-fst-005-${current.label}`,
      })

      const referenceIds = population
        .filter((entry) => entry[current.sourceKey].includes(current.label))
        .map(({ task_id }) => task_id)
      assert.deepEqual(result.hits.map(({ entityId }) => entityId), referenceIds)
      assert.deepEqual(result.total, { value: referenceIds.length, relation: 'eq' })
      assert.deepEqual(result.canonicalCriteria.filter, savedFilter)

      const hit = result.hits[0]?.document
      const labels = hit?.[current.documentKey]
      assert.isTrue(labels?.includes(current.label) === true)

      const facet = result.facets.find(({ field }) => field === current.field)
      assert.deepInclude(facet?.values ?? [], {
        value: current.label,
        count: 1,
        countRelation: 'exact',
        selected: true,
      })
    }
  }).timeout(30_000)
})
