import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

const MIGRATION_PATH = new URL(
  '../../../../../../database/migrations/20260801020000_create_task_specification_contract_foundation.ts',
  import.meta.url
)

test.group('Unit | Task Specification Contract migration policy', () => {
  test('uses additive companion tables and never mutates or drops legacy requirement snapshots', async ({
    assert,
  }) => {
    const source = await readFile(MIGRATION_PATH, 'utf8')

    assert.include(source, 'companion-table strategy')
    assert.include(source, 'task_requirement_versions and task_requirement_version_items remain')
    assert.notMatch(source, /ALTER\s+TABLE\s+task_requirement_versions/i)
    assert.notMatch(source, /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?task_requirement_versions/i)
    assert.notMatch(source, /ALTER\s+TABLE\s+task_requirement_version_items/i)
    assert.notMatch(source, /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?task_requirement_version_items/i)
  })

  test('drops only WP-03 companion tables in reverse dependency order', async ({ assert }) => {
    const source = await readFile(MIGRATION_PATH, 'utf8')
    const down = source.slice(source.indexOf('override async down'))
    const expectedOrder = [
      'task_authoring_heads',
      'task_readiness_assessments',
      'task_evidence_requirements',
      'task_supporting_references',
      'task_contract_versions',
      'task_specification_versions',
    ]
    let priorIndex = -1
    for (const tableName of expectedOrder) {
      const index = down.indexOf(`DROP TABLE IF EXISTS ${tableName}`)
      assert.isAbove(index, priorIndex, `${tableName} must be dropped after its dependants`)
      priorIndex = index
    }
  })

  test('documents requirement-not-proof and readiness-not-delivery boundaries', async ({
    assert,
  }) => {
    const source = await readFile(MIGRATION_PATH, 'utf8')

    assert.include(source, 'never assert that the assignee produced or verified it')
    assert.include(source, 'separate from workflow/delivery status')
    assert.include(source, 'external references do not replace this payload')
  })
})
