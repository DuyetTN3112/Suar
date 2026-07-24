import { randomUUID } from 'node:crypto'

import type { Client } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import { buildSearchGenerationIndexName } from '#modules/search/infra/adapters/index-administration/search_index_names'
import { TASK_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory } from '#tests/helpers/factories'

test.group('Integration | Search Discovery HTTP API', (group) => {
  let client: Client
  let aliasName: string
  let physicalIndexName: string

  group.setup(async () => {
    await setupApp()
    ;({ searchClient: client } = await import('#platform/search/elasticsearch_client'))
    const prefix = process.env['ELASTICSEARCH_INDEX_PREFIX']
    if (prefix === undefined) throw new Error('ELASTICSEARCH_INDEX_PREFIX is required')
    aliasName = `${prefix}tasks`
    physicalIndexName = `${prefix}tasks_v1`
    const leftoverGenerationNames = Object.keys(
      await client.indices.get({
        index: `${aliasName}_v1_http-*`,
        allow_no_indices: true,
        ignore_unavailable: true,
      })
    )
    if (leftoverGenerationNames.length > 0) {
      await client.indices.delete({ index: leftoverGenerationNames }, { ignore: [404] })
    }
    await client.indices.delete({ index: physicalIndexName }, { ignore: [404] })
    await client.indices.create({
      index: physicalIndexName,
      mappings: TASK_SEARCH_INDEX_MAPPINGS,
      aliases: { [aliasName]: { is_write_index: true } },
    })
    await client.index({
      index: aliasName,
      id: 'task-http-discovery-1',
      refresh: 'wait_for',
      document: {
        task_id: 'task-http-discovery-1',
        organization_id: null,
        creator_id: 'creator-http-discovery',
        project_id: null,
        title: 'Production discovery rollout',
        description: 'A public task used to prove the real HTTP Search Discovery path.',
        acceptance_criteria: 'Server totals and facets remain authoritative.',
        context_background: null,
        required_skill_ids: ['skill-typescript'],
        required_skill_ids_known: true,
        required_skill_ids_count: 1,
        required_skill_category_codes: ['software-engineering'],
        required_skill_category_codes_known: true,
        required_skill_category_codes_count: 1,
        required_skills_text: 'TypeScript',
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
        label: 'discovery',
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
        created_at: '2026-08-03T00:00:00.000Z',
        estimated_users_affected: 100,
        external_applications_count: 0,
        deleted_at: null,
        updated_at: '2026-08-03T00:00:00.000Z',
      },
    })
  })

  group.teardown(async () => {
    await client.indices.delete({ index: physicalIndexName }, { ignore: [404] })
    await teardownApp()
  })

  test('executes anonymous filter-only discovery through the real canonical route', async ({
    assert,
    client: http,
  }) => {
    const response = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        filter: {
          kind: 'condition',
          field: 'taxonomy.requiredSkills',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['skill-typescript'] },
        },
        requestedFacets: [{ field: 'taxonomy.requiredSkills', countMode: 'self_excluding' }],
        page: { size: 10 },
      },
      search: { scope: 'task', retrievalMode: 'auto' },
    })

    response.assertStatus(200)
    const body = response.body() as {
      hits: Array<{ entityId: string; source: string }>
      total: { value: number; relation: string }
      facets: Array<{ field: string; values: Array<{ value: string; count: number }> }>
      search: { scope: string; inputMode: string; rankingVersion: string }
      authority: { total: { state: string } }
    }

    assert.deepEqual(
      body.hits.map(({ entityId }) => entityId),
      ['task-http-discovery-1']
    )
    assert.deepEqual(body.total, { value: 1, relation: 'eq' })
    assert.equal(body.hits[0]?.source, 'tasks')
    assert.equal(body.search.scope, 'task')
    assert.equal(body.search.inputMode, 'filter')
    assert.equal(body.search.rankingVersion, 'tasks.lexical.v1')
    assert.equal(body.authority.total.state, 'authoritative')
    assert.isTrue(
      body.facets[0]?.values.some(({ value, count }) => value === 'skill-typescript' && count === 1)
    )
  })

  test('executes combined retrieval with text, strict filters, and preferences through the canonical route', async ({
    assert,
    client: http,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const response = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        text: { value: 'Production discovery rollout' },
        filter: {
          kind: 'condition',
          field: 'taxonomy.requiredSkills',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['skill-typescript'] },
        },
        preferences: [
          {
            effect: 'prefer',
            weight: 5,
            expression: {
              kind: 'condition',
              field: 'task.difficulty',
              operator: 'eq',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 'hard' },
            },
          },
        ],
        requestedFacets: [{ field: 'taxonomy.requiredSkills', countMode: 'self_excluding' }],
        page: { size: 10 },
      },
      search: { scope: 'task', retrievalMode: 'auto' },
    }).loginAs(admin)

    response.assertStatus(200)
    const body = response.body() as {
      hits: Array<{ entityId: string }>
      total: { value: number; relation: string }
      canonicalCriteria: {
        text?: { value: string }
        filter?: { field: string }
        preferences?: Array<{ effect: string; weight?: number }>
      }
      search: { inputMode: string }
      authority: { total: { state: string } }
    }

    assert.deepEqual(body.hits.map(({ entityId }) => entityId), ['task-http-discovery-1'])
    assert.deepEqual(body.total, { value: 1, relation: 'eq' })
    assert.equal(body.search.inputMode, 'combined')
    assert.equal(body.canonicalCriteria.text?.value, 'Production discovery rollout')
    assert.equal(body.canonicalCriteria.filter?.field, 'taxonomy.requiredSkills')
    assert.deepEqual(body.canonicalCriteria.preferences, [
      {
        effect: 'prefer',
        weight: 5,
        expression: {
          kind: 'condition',
          field: 'task.difficulty',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 'hard' },
        },
      },
    ])
    assert.equal(body.authority.total.state, 'authoritative')
  })

  test('rejects forged principal data at the canonical transport boundary', async ({
    client: http,
  }) => {
    const response = await http.post('/api/v1/search/discovery').json({
      principal: { kind: 'service', id: 'forged' },
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        page: { size: 10 },
      },
      search: { scope: 'task' },
    })

    response.assertStatus(422)
  })

  test('returns a stable invalid-cursor diagnostic instead of restarting at page one', async ({
    assert,
    client: http,
  }) => {
    const response = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        page: { size: 10, cursor: 'esc1.tampered.cursor' },
      },
      search: { scope: 'task', retrievalMode: 'auto' },
    })

    response.assertStatus(400)
    const body = response.body() as { code?: string; error?: string }
    assert.equal(body.code, 'SEARCH_CURSOR_INVALID')
    assert.notEqual(body.error, 'Search results returned')
  })

  test('preserves an explicit partial state for blended compatibility results', async ({
    assert,
    client: http,
  }) => {
    const response = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'search.blended.global',
        schemaVersion: 1,
        text: { value: 'provider degradation' },
        page: { size: 10 },
      },
      search: { scope: 'all', retrievalMode: 'lexical' },
    })

    response.assertStatus(200)
    const body = response.body() as {
      hits: unknown[]
      total: { value: number; relation: string }
      execution: { degraded: boolean; partial: boolean }
      search: {
        diagnostics: Array<{ code: string }>
        sources: Array<{ authority: string; state: string }>
      }
      authority: { hits: { state: string }; total: { state: string } }
    }

    assert.isTrue(body.execution.degraded)
    assert.isTrue(body.execution.partial)
    assert.deepEqual(body.total.relation, 'gte')
    assert.isAtLeast(body.total.value, body.hits.length)
    assert.include(
      body.search.diagnostics.map(({ code }) => code),
      'SEARCH_PARTIAL_RESULTS'
    )
    assert.equal(body.authority.hits.state, 'partial')
    assert.equal(body.authority.total.state, 'partial')
    assert.isTrue(body.search.sources.every(({ authority }) => authority === 'partial'))
    assert.isTrue(
      body.search.sources.some(({ state }) =>
        ['ok', 'failed', 'timed_out', 'partial'].includes(state)
      )
    )
  })

  test('fails closed when the task alias has more than one backing generation', async ({
    assert,
    client: http,
  }) => {
    const partialIndexName = buildSearchGenerationIndexName(aliasName, 'http-partial')
    await client.indices.create({ index: partialIndexName, mappings: TASK_SEARCH_INDEX_MAPPINGS })
    await client.indices.updateAliases({
      actions: [{ add: { index: partialIndexName, alias: aliasName } }],
    })

    try {
      const response = await http.post('/api/v1/search/discovery').json({
        criteria: {
          context: 'tasks.discovery.public',
          schemaVersion: 1,
          text: { value: 'partial backing' },
          page: { size: 10 },
        },
        search: { scope: 'task', retrievalMode: 'auto' },
      })

      response.assertStatus(503)
      const body = response.body() as {
        code?: string
        detail?: string
        retryable?: boolean
        hits?: unknown[]
        total?: unknown
      }
      assert.equal(body.code, 'SEARCH_SOURCE_UNAVAILABLE')
      assert.equal(body.detail, 'Search is temporarily unavailable. Please retry.')
      assert.isFalse(body.retryable)
      assert.isUndefined(body.hits)
      assert.isUndefined(body.total)
      assert.notInclude(JSON.stringify(body), partialIndexName)
    } finally {
      await client.indices.updateAliases({
        actions: [{ remove: { index: partialIndexName, alias: aliasName } }],
      })
      await client.indices.delete({ index: partialIndexName }, { ignore: [404] })
    }
  })

  test('returns a stale-cursor diagnostic after the active task generation changes', async ({
    assert,
    client: http,
  }) => {
    const current = await client.get<Record<string, unknown>>({
      index: aliasName,
      id: 'task-http-discovery-1',
    })
    await client.index({
      index: physicalIndexName,
      id: 'task-http-discovery-2',
      refresh: 'wait_for',
      document: {
        ...current._source,
        task_id: 'task-http-discovery-2',
        title: 'A second task for stale cursor verification',
      },
    })
    const nextGeneration = buildSearchGenerationIndexName(
      aliasName,
      `http-stale-${randomUUID().replaceAll('-', '')}`
    )
    await client.indices.create({ index: nextGeneration, mappings: TASK_SEARCH_INDEX_MAPPINGS })
    await client.index({
      index: nextGeneration,
      id: 'task-http-discovery-1',
      refresh: 'wait_for',
      document: current._source,
    })

    const first = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        page: { size: 1 },
      },
      search: { scope: 'task', retrievalMode: 'auto' },
    })
    first.assertStatus(200)
    const cursor = (first.body() as { page?: { nextCursor?: string } }).page?.nextCursor
    assert.isString(cursor)

    await client.indices.updateAliases({
      actions: [
        { remove: { index: physicalIndexName, alias: aliasName } },
        { add: { index: nextGeneration, alias: aliasName, is_write_index: true } },
      ],
    })

    try {
      const response = await http.post('/api/v1/search/discovery').json({
        criteria: {
          context: 'tasks.discovery.public',
          schemaVersion: 1,
          page: { size: 1, cursor },
        },
        search: { scope: 'task', retrievalMode: 'auto' },
      })

      response.assertStatus(400)
      const body = response.body() as { code?: string; error?: string; detail?: string }
      assert.equal(body.code, 'SEARCH_CURSOR_STALE')
      assert.notEqual(body.error, 'Search results returned')
      assert.notInclude(JSON.stringify(body), nextGeneration)
      assert.notInclude(JSON.stringify(body), 'search_context_missing_exception')
      assert.include(body.detail ?? '', 'Search results changed')
    } finally {
      await client.indices.updateAliases({
        actions: [
          { remove: { index: nextGeneration, alias: aliasName } },
          { add: { index: physicalIndexName, alias: aliasName, is_write_index: true } },
        ],
      })
      await client
        .deleteByQuery({
          index: physicalIndexName,
          query: { term: { task_id: 'task-http-discovery-2' } },
          refresh: true,
        })
        .catch(() => undefined)
      await client.indices.delete({ index: nextGeneration }, { ignore: [404] })
    }
  }).timeout(5_000)

  test('keeps the authenticated compatibility POST route aligned with canonical discovery', async ({
    assert,
    client: http,
  }) => {
    const admin = await UserFactory.createSuperadmin()
    const response = await http
      .post('/api/search/query')
      .loginAs(admin)
      .json({
        criteria: {
          context: 'tasks.discovery.public',
          schemaVersion: 1,
          page: { size: 10 },
        },
        search: { scope: 'task', retrievalMode: 'auto' },
      })

    response.assertStatus(200)
    const body = response.body() as {
      hits: Array<{ entityId: string }>
      total: { value: number; relation: string }
      search: { scope: string; inputMode: string }
    }
    assert.deepEqual(body.hits.map(({ entityId }) => entityId), ['task-http-discovery-1'])
    assert.deepEqual(body.total, { value: 1, relation: 'eq' })
    assert.equal(body.search.scope, 'task')
    assert.equal(body.search.inputMode, 'browse')
  })

  test('returns a safe retryable 503 when the canonical discovery index is unavailable', async ({
    assert,
    client: http,
  }) => {
    await client.indices.delete({ index: physicalIndexName }, { ignore: [404] })

    const response = await http.post('/api/v1/search/discovery').json({
      criteria: {
        context: 'tasks.discovery.public',
        schemaVersion: 1,
        text: { value: 'provider outage' },
        page: { size: 10 },
      },
      search: { scope: 'task', retrievalMode: 'auto' },
    })

    response.assertStatus(503)
    const body = response.body() as {
      code?: string
      detail?: string
      retryable?: boolean
    }

    assert.equal(body.code, 'SEARCH_SOURCE_UNAVAILABLE')
    assert.isFalse(body.retryable)
    assert.equal(body.detail, 'Search is temporarily unavailable. Please retry.')
    assert.notInclude(JSON.stringify(body), physicalIndexName)
    assert.notInclude(JSON.stringify(body), 'elasticsearch')

    const explicitlyRetryable = await http
      .post('/api/v1/search/discovery')
      .header('Idempotency-Key', 'search-discovery-outage-retry')
      .json({
        criteria: {
          context: 'tasks.discovery.public',
          schemaVersion: 1,
          text: { value: 'provider outage' },
          page: { size: 10 },
        },
        search: { scope: 'task', retrievalMode: 'auto' },
      })

    explicitlyRetryable.assertStatus(503)
    const explicitlyRetryableBody = explicitlyRetryable.body() as {
      code?: string
      retryable?: boolean
    }
    assert.equal(explicitlyRetryableBody.code, 'SEARCH_SOURCE_UNAVAILABLE')
    assert.isTrue(explicitlyRetryableBody.retryable)
  })
})
