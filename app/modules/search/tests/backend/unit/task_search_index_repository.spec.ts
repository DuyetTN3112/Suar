import { test } from '@japa/runner'

import {
  TASK_SEARCH_INDEX_MAPPINGS,
  TaskSearchIndexMigrationRequiredError,
  TaskSearchIndexRepository,
} from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'

function mappingType(field: string): string | undefined {
  const property = TASK_SEARCH_INDEX_MAPPINGS.properties?.[field]
  return property && typeof property === 'object' && 'type' in property ? property.type : undefined
}

test.group('Unit | Task Search Index Repository', () => {
  test('declares strict presence, cardinality, taxonomy, and permission projection mappings', ({
    assert,
  }) => {
    assert.equal(TASK_SEARCH_INDEX_MAPPINGS.dynamic, 'strict')

    const multiValueFields = [
      'required_skill_ids',
      'required_skill_category_codes',
      'business_domains',
      'problem_categories',
      'task_types',
      'tech_stack',
      'domain_tags',
      'learning_objectives',
    ]

    for (const field of multiValueFields) {
      assert.equal(mappingType(`${field}_known`), 'boolean', `${field} presence mapping`)
      assert.equal(mappingType(`${field}_count`), 'long', `${field} cardinality mapping`)
    }

    assert.equal(mappingType('required_skill_category_codes'), 'keyword')
    assert.equal(mappingType('canonical_term_ids'), 'keyword')
    assert.equal(mappingType('canonical_term_ids_known'), 'boolean')
    assert.equal(mappingType('canonical_term_ids_count'), 'long')
    assert.equal(mappingType('assignment_provenance'), 'keyword')
    assert.equal(mappingType('assignment_review_states'), 'keyword')
    assert.equal(mappingType('taxonomy_versions'), 'keyword')
    assert.equal(mappingType('taxonomy_versions_by_namespace'), 'object')
    assert.equal(mappingType('taxonomy_completeness'), 'keyword')
    assert.equal(mappingType('taxonomy_completeness_by_namespace'), 'object')
    assert.equal(mappingType('metadata_assignment_schema_version'), 'long')
    assert.equal(mappingType('metadata_source_revisions'), 'keyword')
    assert.equal(mappingType('metadata_enrichment_versions_by_namespace'), 'object')
    for (const field of [
      'is_deleted',
      'marketplace_visible',
      'application_eligible',
      'member_visible',
    ]) {
      assert.equal(mappingType(field), 'boolean', `${field} permission mapping`)
    }
  })

  test('resolves exactly one active physical generation and fails closed otherwise', async ({
    assert,
  }) => {
    const repository = new TaskSearchIndexRepository()
    const lifecycle = (
      repository as unknown as {
        lifecycle: { getBackingIndices(): Promise<string[]> }
      }
    ).lifecycle

    lifecycle.getBackingIndices = () => Promise.resolve([repository.physicalIndexName])
    assert.deepEqual(await repository.resolveActiveIndexTarget(), {
      physicalIndexName: repository.physicalIndexName,
      generation: repository.physicalIndexName,
    })

    for (const backingIndices of [
      [],
      [repository.physicalIndexName, `${repository.indexName}_v1_generation-b`],
      ['foreign_index'],
    ]) {
      lifecycle.getBackingIndices = () => Promise.resolve(backingIndices)
      await assert.rejects(
        () => repository.resolveActiveIndexTarget(),
        TaskSearchIndexMigrationRequiredError
      )
    }
  })
})
