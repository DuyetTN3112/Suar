import { test } from '@japa/runner'

import { assertFilterContextExecutorCompatibility } from '#modules/filtering/infra/adapters/filtering-runtime/in_memory_filter_context_registry'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  mapTaskSearchDiscoveryHit,
  TASK_SEARCH_DISCOVERY_BINDINGS,
} from '#modules/search/infra/adapters/entity-search/tasks/task_search_discovery_bindings'
import { elasticsearchOperatorsForBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import { TASK_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import {
  TASK_DISCOVERY_CONTEXTS,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'

test.group('Task Search discovery bindings', () => {
  test('covers every domain context field with an executor-compatible binding', async ({
    assert,
  }) => {
    const capabilities = {
      text: true,
      facets: true,
      nestedGroups: true,
      preferences: true,
      relativeTime: true,
      relations: false,
      pagination: ['cursor'] as const,
      facetCountModes: ['constrained', 'self_excluding'] as const,
      totalRelations: ['eq', 'gte', 'unknown'] as const,
      maxDepth: 8,
      maxConditions: 200,
      maxPageSize: 500,
      maxFacetRequests: 50,
      maxProjectionFields: 100,
      maxSorts: 8,
      maxCost: 10_000,
      fieldOperators: elasticsearchOperatorsForBindings(TASK_SEARCH_DISCOVERY_BINDINGS),
    }
    const provider = new TaskDiscoveryFilterContextProvider()
    const definitions = await Promise.all([
      provider.getEffectiveDefinition({
        context: TASK_DISCOVERY_CONTEXTS.public,
        principal: { kind: 'anonymous' },
      }),
      provider.getEffectiveDefinition({
        context: TASK_DISCOVERY_CONTEXTS.member,
        principal: {
          kind: 'user',
          id: 'user-1',
          organizationId: 'org-1',
          organizationRole: OrganizationRole.MEMBER,
        },
      }),
    ])

    for (const definition of definitions) {
      assert.doesNotThrow(() => assertFilterContextExecutorCompatibility(definition, capabilities))
    }
  })

  test('binds only paths present in the strict production mapping', ({ assert }) => {
    const mappedPaths = new Set(Object.keys(TASK_SEARCH_INDEX_MAPPINGS.properties ?? {}))
    for (const binding of Object.values(TASK_SEARCH_DISCOVERY_BINDINGS)) {
      for (const path of [binding.path, binding.presencePath, binding.cardinalityPath]) {
        if (path !== undefined) assert.isTrue(mappedPaths.has(path), `Missing mapping: ${path}`)
      }
    }
  })

  test('maps an allowlisted hit without exposing permission or raw provider fields', ({
    assert,
  }) => {
    const source = {
      task_id: 'task-1',
      title: 'PostgreSQL search',
      description: 'Tune discovery filters',
      organization_id: 'org-1',
      project_id: null,
      required_skill_ids: ['skill-pg', 'skill-pg'],
      required_skill_category_codes: ['database'],
      canonical_term_ids: ['technologies:postgresql'],
      business_domains: ['fintech'],
      domain_tags: ['payments'],
      problem_categories: ['search'],
      task_types: ['engineering'],
      tech_stack: ['postgresql'],
      difficulty: 'hard',
      application_eligible: true,
      role_in_task: 'database-engineer',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
      due_date: null,
      application_deadline: null,
      is_deleted: false,
      marketplace_visible: true,
      member_visible: true,
      secret_provider_field: 'must-not-leak',
    }

    const hit = mapTaskSearchDiscoveryHit({ id: 'task-1', source, score: 8 })

    assert.equal(hit.id, 'task:task-1')
    assert.equal(hit.rank, 0)
    assert.deepEqual(hit.presentation, {
      title: 'PostgreSQL search',
      url: '/tasks/task-1',
      sourceLabel: 'Task',
      snippets: ['Tune discovery filters'],
      breadcrumbs: [],
      primaryActionLabel: 'Open task',
    })
    assert.deepEqual(hit.document.requiredSkillIds, ['skill-pg'])
    assert.deepEqual(hit.document.canonicalTermIds, ['technologies:postgresql'])
    assert.notProperty(hit.document, 'is_deleted')
    assert.notProperty(hit.document, 'marketplace_visible')
    assert.notProperty(hit.document, 'secret_provider_field')
    assert.throws(
      () => mapTaskSearchDiscoveryHit({ id: 'task-other', source, score: 8 }),
      'Task discovery hit identity mismatch'
    )
  })

  test('preserves a missing organization without poisoning the complete result page', ({
    assert,
  }) => {
    const source = {
      task_id: 'task-without-organization',
      title: 'Independent public task',
      description: 'Organization metadata is absent',
      organization_id: null,
      project_id: null,
      required_skill_ids: [],
      required_skill_category_codes: [],
      business_domains: [],
      domain_tags: [],
      problem_categories: [],
      task_types: [],
      tech_stack: [],
      difficulty: null,
      application_eligible: true,
      role_in_task: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
      due_date: null,
      application_deadline: null,
    }

    const hit = mapTaskSearchDiscoveryHit({
      id: 'task-without-organization',
      source,
      score: 1,
    })

    assert.isNull(hit.document.organizationId)
  })
})
