import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

const REQUIRED_TABLES = [
  'task_specification_versions',
  'task_contract_versions',
  'task_supporting_references',
  'task_evidence_requirements',
  'task_readiness_assessments',
  'task_authoring_heads',
] as const

test.group('Integration | Task Specification and Contract schema', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('creates the additive Task authoring companion tables', async ({ assert }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [...REQUIRED_TABLES])) as { table_name: string }[]

    const actualTables = new Set(rows.map((row) => row.table_name))
    for (const tableName of REQUIRED_TABLES) {
      assert.isTrue(actualTables.has(tableName), `Missing table ${tableName}`)
    }
  })

  test('exposes the immutable payload, audit, pointer, and lookup columns/indexes', async ({
    assert,
  }) => {
    const expectedColumns: Record<string, readonly string[]> = {
      task_specification_versions: [
        'schema_version',
        'task_id',
        'version_number',
        'rich_content',
        'plain_text_projection',
        'section_index',
        'project_context_version_id',
        'work_package_version_id',
        'author_id',
        'confirmation_state',
        'content_hash',
        'change_class',
        'source_provenance',
      ],
      task_contract_versions: [
        'schema_version',
        'task_id',
        'task_specification_version_id',
        'version_number',
        'work_contract',
        'evidence_contract',
        'resolved_contract',
        'resolution_provenance',
        'readiness_state',
        'creator_confirmed_by',
        'creator_confirmed_at',
        'content_hash',
        'effective_from',
      ],
      task_supporting_references: [
        'reference_id',
        'task_specification_version_id',
        'uri',
        'uri_hash',
        'relation',
        'access_state',
        'reference_fingerprint',
      ],
      task_evidence_requirements: [
        'evidence_requirement_id',
        'task_contract_version_id',
        'criterion_ids',
        'deliverable_ids',
        'required',
        'ordinal',
      ],
      task_readiness_assessments: [
        'task_specification_version_id',
        'task_contract_version_id',
        'policy_version',
        'assessment_input',
        'input_hash',
        'work_state',
        'evidence_state',
        'assignment_ready',
        'evidence_ready',
        'blockers',
        'warnings',
        'result_hash',
      ],
      task_authoring_heads: [
        'task_id',
        'current_specification_version_id',
        'current_contract_version_id',
        'revision',
      ],
    }

    let actualReadinessColumns = new Set<string>()
    for (const [tableName, requiredColumns] of Object.entries(expectedColumns)) {
      const rows = (await db
        .from('information_schema.columns')
        .select('column_name', 'column_default')
        .where('table_schema', 'public')
        .where('table_name', tableName)) as {
        column_name: string
        column_default: string | null
      }[]
      const columnNames = new Set(rows.map((row) => row.column_name))
      if (tableName === 'task_readiness_assessments') {
        actualReadinessColumns = columnNames
      }
      for (const columnName of requiredColumns) {
        assert.isTrue(columnNames.has(columnName), `Missing ${tableName}.${columnName}`)
      }

      if (tableName !== 'task_authoring_heads') {
        assert.include(
          rows.find((row) => row.column_name === 'id')?.column_default ?? '',
          'gen_random_uuid_v7()'
        )
      }
    }

    for (const forbiddenDeliveryColumn of [
      'status',
      'delivery_status',
      'completed_at',
      'done_at',
    ]) {
      assert.isFalse(
        actualReadinessColumns.has(forbiddenDeliveryColumn),
        `Readiness must not duplicate delivery field ${forbiddenDeliveryColumn}`
      )
    }

    const indexRows = (await db
      .from('pg_indexes')
      .select('indexname')
      .where('schemaname', 'public')
      .whereIn('tablename', [...REQUIRED_TABLES])) as { indexname: string }[]
    const indexes = new Set(indexRows.map((row) => row.indexname))
    for (const indexName of [
      'idx_task_specification_versions_task_latest',
      'idx_task_specification_versions_hash',
      'idx_task_contract_versions_task_latest',
      'idx_task_contract_versions_readiness',
      'idx_task_supporting_references_uri_hash',
      'idx_task_evidence_requirements_contract',
      'idx_task_readiness_assessments_task_latest',
      'uq_task_readiness_assessments_deterministic_input',
      'idx_task_authoring_heads_contract',
    ]) {
      assert.isTrue(indexes.has(indexName), `Missing index ${indexName}`)
    }
  })

  test('keeps the deployed skill-only requirement tables beside the companion model', async ({
    assert,
  }) => {
    const rows = (await db
      .from('information_schema.tables')
      .select('table_name')
      .where('table_schema', 'public')
      .whereIn('table_name', [
        'task_requirement_versions',
        'task_requirement_version_items',
        ...REQUIRED_TABLES,
      ])) as { table_name: string }[]
    const tables = new Set(rows.map((row) => row.table_name))

    assert.isTrue(tables.has('task_requirement_versions'))
    assert.isTrue(tables.has('task_requirement_version_items'))
    for (const tableName of REQUIRED_TABLES) {
      assert.isTrue(tables.has(tableName))
    }
  })
})
