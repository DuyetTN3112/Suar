import { test } from '@japa/runner'

import {
  condition,
  semanticState,
  migrationInput,
  migrateFilterSchema,
} from '../support/filter_schema_migration_test_support.js'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type {
  FilterSchemaForwardReader,
  FilterSchemaMigrationStep,
} from '#modules/filtering/domain/filtering-core/filter_schema_migration'
import {
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'


test.group('Unit | Filter schema migration resilience', () => {
  test('blocks a missing hop, then retries the same source successfully when the chain is repaired', ({
    assert,
  }) => {
    const first: FilterSchemaMigrationStep = {
      id: 'field-v1-v2',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      fromVersion: 1,
      toVersion: 2,
      operations: [{ kind: 'rename_field', fromField: 'legacy_status', toField: 'status' }],
    }
    const blocked = migrateFilterSchema(migrationInput([first], { toVersion: 3 }))
    const retried = migrateFilterSchema(
      migrationInput(
        [
          first,
          {
            id: 'noop-v2-v3',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 2,
            toVersion: 3,
            operations: [],
          },
        ],
        { toVersion: 3 }
      )
    )

    assert.equal(blocked.outcome, 'blocked')
    assert.equal(blocked.diagnostics.at(-1)?.code, 'missing_migration_hop')
    assert.equal(blocked.effectiveVersion, 1)
    assert.isNull(blocked.atomicPayload)
    assert.equal(retried.inputChecksum, blocked.inputChecksum)
    assert.equal(retried.outcome, 'migrated')
    assert.equal(retried.effectiveVersion, 3)
  })

  test('blocks corrupt JSON and checksum mismatches without advancing or broadening criteria', ({
    assert,
  }) => {
    const corrupt = migrateFilterSchema(migrationInput([], { payload: '{"filter":', toVersion: 2 }))
    const corruptShape = migrateFilterSchema(
      migrationInput([], {
        payload:
          '{"filter":{"effect":"require","field":"status","kind":"condition","operator":"eq","unknown":"exclude","value":{"kind":"provider_dsl","query":{"match_all":{}}}},"projection":[],"sort":[],"textQuery":null}',
        toVersion: 2,
      })
    )
    const mismatch = migrateFilterSchema(
      migrationInput([], { inputChecksum: 'not-the-real-checksum', toVersion: 2 })
    )

    assert.equal(corrupt.outcome, 'blocked')
    assert.equal(corrupt.diagnostics[0]?.code, 'corrupt_semantic_payload')
    assert.equal(corrupt.preservedPayloadJson, '{"filter":')
    assert.equal(corrupt.alertDisposition, 'pause_blocked')
    assert.equal(corruptShape.outcome, 'blocked')
    assert.equal(corruptShape.diagnostics[0]?.code, 'corrupt_semantic_payload')
    assert.equal(mismatch.outcome, 'blocked')
    assert.equal(mismatch.diagnostics[0]?.code, 'input_checksum_mismatch')
    assert.isNull(mismatch.atomicPayload)
  })

  test('uses the WP-01 validator rules when reading persisted semantic payloads', ({ assert }) => {
    let tooDeep: FilterExpression = condition('status', 'eq', 'open')
    for (let depth = 0; depth < 6; depth += 1) {
      tooDeep = {
        kind: 'group',
        combinator: 'and',
        children: [tooDeep, condition(`status_${depth}`, 'eq', 'open')],
      }
    }
    const invalidFilters: unknown[] = [
      {
        kind: 'condition',
        field: 'status',
        operator: 'contains_any',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'scalar', value: 'open' },
      },
      {
        kind: 'condition',
        field: 'status',
        operator: 'exists',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'scalar', value: 'must-not-be-present' },
      },
      {
        kind: 'condition',
        field: 'tags',
        operator: 'contains_any',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: Array.from({ length: 101 }, (_, index) => `tag-${index}`) },
      },
      {
        kind: 'condition',
        field: 'title',
        operator: 'contains',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'scalar', value: 'x'.repeat(513) },
      },
      tooDeep,
      {
        kind: 'condition',
        field: 'tags',
        operator: 'contains_at_least',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: ['one'], minimumMatch: 0 },
      },
      {
        kind: 'condition',
        field: 'amount',
        operator: 'between',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'range' },
      },
      {
        kind: 'condition',
        field: 'created_at',
        operator: 'within_last',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'relative_time', amount: 0, unit: 'day', anchor: 'now' },
      },
      {
        kind: 'condition',
        field: 'comments',
        operator: 'related_count',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'range', gte: -1, lte: 1.5 },
      },
      {
        kind: 'group',
        combinator: 'and',
        children: [condition('status', 'eq', 'open')],
      },
      {
        kind: 'condition',
        field: 'status',
        operator: 'provider_dsl',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'scalar', value: 'open' },
      },
    ]

    for (const filter of invalidFilters) {
      const payloadJson = JSON.stringify({ filter, textQuery: null, sort: [], projection: [] })
      assert.throws(() => parseSavedFilterSemanticState(payloadJson), /corrupt_semantic_payload/)
    }
  })

  test('blocks cyclic object payloads without throwing or advancing schema state', ({ assert }) => {
    const cyclic = condition('project', 'related_matches', 'ignored') as Extract<
      FilterExpression,
      { kind: 'condition' }
    >
    cyclic.value = { kind: 'relation', expression: cyclic }
    let result: ReturnType<typeof migrateFilterSchema> | undefined

    assert.doesNotThrow(() => {
      result = migrateFilterSchema(
        migrationInput([], {
          payload: {
            filter: cyclic,
            textQuery: null,
            sort: [],
            projection: [],
          },
        })
      )
    })
    assert.equal(result?.outcome, 'blocked')
    assert.equal(result?.diagnostics[0]?.code, 'cyclic_semantic_payload')
    assert.isNull(result?.atomicPayload)

    assert.doesNotThrow(() => {
      result = migrateFilterSchema(
        migrationInput([], {
          payload: undefined as unknown as SavedFilterSemanticState,
        })
      )
    })
    assert.equal(result?.outcome, 'blocked')
    assert.equal(result?.diagnostics[0]?.code, 'corrupt_semantic_payload')
  })

  test('uses a forward reader for rollback without destructively downgrading newer payload', ({
    assert,
  }) => {
    const reader: FilterSchemaForwardReader = {
      id: 'reader-v2-through-v3',
      contextKey: 'work_item.discovery',
      contextOwner: 'tasks',
      readerVersion: 2,
      readableSchemaVersions: [2, 3],
    }
    const payload = semanticState(condition('status', 'eq', 'open'))
    const result = migrateFilterSchema(
      migrationInput([], {
        fromVersion: 3,
        toVersion: 2,
        payload,
        forwardReaders: [reader],
      })
    )
    const blocked = migrateFilterSchema(
      migrationInput([], { fromVersion: 3, toVersion: 2, payload, forwardReaders: [] })
    )

    assert.equal(result.outcome, 'compatible')
    assert.equal(result.effectiveVersion, 3)
    assert.equal(result.readerVersion, 2)
    assert.equal(result.atomicPayload?.schemaVersion, 3)
    assert.equal(result.atomicPayload?.payloadJson, serializeSavedFilterSemanticState(payload))
    assert.equal(blocked.outcome, 'blocked')
    assert.equal(blocked.diagnostics[0]?.code, 'schema_downgrade_not_supported')
  })

  test('blocks migration cycles and cross-context/schema-owner steps', ({ assert }) => {
    const cycle = migrateFilterSchema(
      migrationInput(
        [
          {
            id: 'v1-v2',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 1,
            toVersion: 2,
            operations: [],
          },
          {
            id: 'v2-v1',
            contextKey: 'work_item.discovery',
            contextOwner: 'tasks',
            fromVersion: 2,
            toVersion: 1,
            operations: [],
          },
        ],
        { toVersion: 3 }
      )
    )
    const wrongOwner = migrateFilterSchema(
      migrationInput([
        {
          id: 'wrong-owner-v1-v2',
          contextKey: 'work_item.discovery',
          contextOwner: 'marketplace',
          fromVersion: 1,
          toVersion: 2,
          operations: [],
        },
      ])
    )

    assert.equal(cycle.outcome, 'blocked')
    assert.equal(cycle.diagnostics.at(-1)?.code, 'migration_cycle')
    assert.equal(cycle.effectiveVersion, 1)
    assert.equal(wrongOwner.outcome, 'blocked')
    assert.equal(wrongOwner.diagnostics[0]?.code, 'migration_context_mismatch')
  })
})
