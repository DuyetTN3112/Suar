import { test } from '@japa/runner'

import {
  condition,
  semanticState,
  migrationInput,
  migrateFilterSchema,
  successfulPayload,
} from '../support/filter_schema_migration_test_support.js'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterSchemaMigrationStep } from '#modules/filtering/domain/filtering-core/filter_schema_migration'
import {
  serializeSavedFilterSemanticState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'


test.group('Unit | Filter schema migration transitions', () => {
  test('orders field rename and operator migrations deterministically', ({ assert }) => {
    const rename: FilterSchemaMigrationStep = {
      id: 'status-field-v1-v2',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      fromVersion: 1,
      toVersion: 2,
      operations: [{ kind: 'rename_field', fromField: 'legacy_status', toField: 'status' }],
    }
    const operator: FilterSchemaMigrationStep = {
      id: 'status-operator-v2-v3',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      fromVersion: 2,
      toVersion: 3,
      operations: [
        {
          kind: 'change_operator',
          field: 'status',
          fromOperator: 'eq',
          toOperator: 'in',
          valueTransform: 'scalar_to_set',
        },
      ],
    }

    const result = migrateFilterSchema(
      migrationInput([operator, rename], {
        toVersion: 3,
        payload: semanticState(condition(' legacy_status ', 'eq', 'open')),
      })
    )
    const repeated = migrateFilterSchema(
      migrationInput([rename, operator], {
        toVersion: 3,
        payload: semanticState(condition(' legacy_status ', 'eq', 'open')),
      })
    )

    assert.equal(result.outcome, 'migrated')
    assert.equal(result.effectiveVersion, 3)
    assert.deepEqual(
      result.migrationReceipts.map((receipt) => receipt.migrationId),
      ['status-field-v1-v2', 'status-operator-v2-v3']
    )
    assert.deepEqual(result, repeated)
    const payload = successfulPayload(result)
    assert.deepEqual(payload.filter, {
      kind: 'condition',
      field: 'status',
      operator: 'in',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: ['open'] },
    })
  })

  test('renames every semantic field reference, including nested relations, sort, and projection', ({
    assert,
  }) => {
    const rename: FilterSchemaMigrationStep = {
      id: 'assignee-field-v1-v2',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      fromVersion: 1,
      toVersion: 2,
      operations: [{ kind: 'rename_field', fromField: 'legacy_assignee', toField: 'assignee' }],
    }
    const nested: FilterExpression = {
      kind: 'condition',
      field: 'project',
      operator: 'related_matches',
      effect: 'require',
      unknown: 'exclude',
      value: {
        kind: 'relation',
        expression: condition('legacy_assignee', 'eq', 'user-1'),
      },
    }

    const result = migrateFilterSchema(
      migrationInput([rename], {
        payload: {
          filter: nested,
          textQuery: null,
          sort: [{ field: ' legacy_assignee ', direction: 'asc' }],
          projection: ['title', ' legacy_assignee '],
        },
      })
    )

    assert.equal(result.outcome, 'migrated')
    assert.deepEqual(successfulPayload(result), {
      filter: {
        ...nested,
        value: {
          kind: 'relation',
          expression: condition('assignee', 'eq', 'user-1'),
        },
      },
      textQuery: null,
      sort: [{ field: 'assignee', direction: 'asc' }],
      projection: ['title', 'assignee'],
    })

    const referenceOnly = migrateFilterSchema(
      migrationInput([rename], {
        payload: {
          filter: null,
          textQuery: null,
          sort: [{ field: 'legacy_assignee', direction: 'desc' }],
          projection: ['legacy_assignee'],
        },
      })
    )
    assert.equal(referenceOnly.outcome, 'migrated')
    assert.deepEqual(successfulPayload(referenceOnly).sort, [
      { field: 'assignee', direction: 'desc' },
    ])
    assert.deepEqual(successfulPayload(referenceOnly).projection, ['assignee'])
  })

  test('returns compatible with an atomic version advance when no rewrite is needed', ({
    assert,
  }) => {
    const result = migrateFilterSchema(
      migrationInput([
        {
          id: 'unrelated-field-v1-v2',
          contextKey: 'work_item.discovery',
          contextOwner: 'tasks',
          fromVersion: 1,
          toVersion: 2,
          operations: [{ kind: 'rename_field', fromField: 'other', toField: 'renamed_other' }],
        },
      ])
    )

    assert.equal(result.outcome, 'compatible')
    assert.equal(result.atomicPayload?.schemaVersion, 2)
    assert.equal(result.atomicPayload?.checksum, result.inputChecksum)
  })

  test('uses migration ID plus input checksum as a stable idempotency identity', ({ assert }) => {
    const step: FilterSchemaMigrationStep = {
      id: 'field-v1-v2',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      fromVersion: 1,
      toVersion: 2,
      operations: [{ kind: 'rename_field', fromField: 'legacy_status', toField: 'status' }],
    }
    const first = migrateFilterSchema(migrationInput([step]))
    const replay = migrateFilterSchema(migrationInput([step]))

    assert.deepEqual(replay, first)
    assert.equal(first.migrationReceipts[0]?.idempotencyKey, `${step.id}:${first.inputChecksum}`)
  })

  test('migrates taxonomy merges and deterministic retirements without losing other values', ({
    assert,
  }) => {
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'taxonomy-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_merge',
                field: 'domain_tags',
                sourceTermIds: ['domain:old-a'],
                replacementTermId: 'domain:new',
              },
              {
                kind: 'taxonomy_retire',
                field: 'domain_tags',
                termId: 'domain:old-b',
                replacementTermId: 'domain:new',
              },
            ],
          },
        ],
        {
          payload: semanticState({
            kind: 'condition',
            field: 'domain_tags',
            operator: 'contains_any',
            effect: 'require',
            unknown: 'exclude',
            value: {
              kind: 'set',
              values: ['domain:old-a', 'domain:keep', 'domain:old-b'],
            },
          }),
        }
      )
    )

    assert.equal(result.outcome, 'migrated')
    const payload = successfulPayload(result)
    if (payload.filter?.kind !== 'condition' || payload.filter.value?.kind !== 'set') {
      throw new Error('Expected migrated taxonomy set')
    }
    assert.deepEqual(payload.filter.value.values, ['domain:keep', 'domain:new'])
  })

  test('requires repair when a taxonomy merge would invalidate minimumMatch', ({ assert }) => {
    const source: SavedFilterSemanticState = {
      filter: {
        kind: 'condition',
        field: 'domain_tags',
        operator: 'contains_at_least',
        effect: 'require',
        unknown: 'exclude',
        value: {
          kind: 'set',
          values: ['domain:old-a', 'domain:old-b'],
          minimumMatch: 2,
        },
      },
      textQuery: null,
      sort: [],
      projection: [],
    }
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'taxonomy-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_merge',
                field: 'domain_tags',
                sourceTermIds: ['domain:old-a', 'domain:old-b'],
                replacementTermId: 'domain:new',
              },
            ],
          },
        ],
        { payload: source }
      )
    )

    assert.equal(result.outcome, 'requires_repair')
    assert.equal(result.diagnostics[0]?.code, 'taxonomy_minimum_match_requires_repair')
    assert.equal(result.effectiveVersion, 1)
    assert.isNull(result.atomicPayload)
    assert.equal(result.preservedPayloadJson, serializeSavedFilterSemanticState(source))
  })

  test('requires repair when a taxonomy retirement replacement collapses minimumMatch', ({
    assert,
  }) => {
    const source: SavedFilterSemanticState = {
      filter: {
        kind: 'condition',
        field: 'domain_tags',
        operator: 'contains_at_least',
        effect: 'require',
        unknown: 'exclude',
        value: {
          kind: 'set',
          values: ['domain:retired', 'domain:replacement'],
          minimumMatch: 2,
        },
      },
      textQuery: null,
      sort: [],
      projection: [],
    }
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'taxonomy-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_retire',
                field: 'domain_tags',
                termId: 'domain:retired',
                replacementTermId: 'domain:replacement',
              },
            ],
          },
        ],
        { payload: source }
      )
    )

    assert.equal(result.outcome, 'requires_repair')
    assert.equal(result.diagnostics[0]?.code, 'taxonomy_minimum_match_requires_repair')
    assert.equal(result.preservedPayloadJson, serializeSavedFilterSemanticState(source))
  })

  test('blocks a retired taxonomy term from replacing itself', ({ assert }) => {
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'taxonomy-retire-self-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_retire',
                field: 'topics',
                termId: 'legacy',
                replacementTermId: 'legacy',
              },
            ],
          },
        ],
        {
          payload: semanticState({
            kind: 'condition',
            field: 'topics',
            operator: 'contains_any',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'set', values: ['legacy'] },
          }),
        }
      )
    )

    assert.equal(result.outcome, 'requires_repair')
    assert.equal(result.diagnostics[0]?.code, 'invalid_taxonomy_replacement')
    assert.equal(result.effectiveVersion, 1)
  })

  test('requires repair for a retirement without replacement and preserves the obsolete condition', ({
    assert,
  }) => {
    const source = semanticState(condition('domain_tags', 'eq', 'domain:retired'))
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'retire-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_retire',
                field: 'domain_tags',
                termId: 'domain:retired',
                replacementTermId: null,
              },
            ],
          },
        ],
        { payload: source }
      )
    )

    assert.equal(result.outcome, 'requires_repair')
    assert.equal(result.effectiveVersion, 1)
    assert.isNull(result.atomicPayload)
    assert.equal(result.alertDisposition, 'pause_requires_repair')
    assert.equal(result.preservedPayloadJson, serializeSavedFilterSemanticState(source))
    assert.match(result.diagnostics[0]?.message ?? '', /domain:retired/)
  })

  test('requires repair for an ambiguous taxonomy split without guessing or partially advancing', ({
    assert,
  }) => {
    const source = semanticState(condition('domain_tags', 'eq', 'domain:old'))
    const result = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'split-v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [
              {
                kind: 'taxonomy_split',
                field: 'domain_tags',
                termId: 'domain:old',
                replacementTermIds: ['domain:new-a', 'domain:new-b'],
              },
            ],
          },
        ],
        { payload: source }
      )
    )

    assert.equal(result.outcome, 'requires_repair')
    assert.equal(result.effectiveVersion, 1)
    assert.isNull(result.atomicPayload)
    assert.equal(result.preservedPayloadJson, serializeSavedFilterSemanticState(source))
    assert.equal(result.diagnostics[0]?.code, 'ambiguous_taxonomy_split')
  })
})
