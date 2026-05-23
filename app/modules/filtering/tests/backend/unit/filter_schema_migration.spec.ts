import { test } from '@japa/runner'

import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  migrateFilterSchema as executeFilterSchemaMigration,
  type FilterSchemaForwardReader,
  type FilterSchemaMigrationInput,
  type FilterSchemaMigrationStep,
} from '#modules/filtering/domain/filtering-core/filter_schema_migration'
import {
  parseSavedFilterSemanticState,
  serializeSavedFilterSemanticState,
  type SavedFilterSemanticState,
} from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'

const migrateFilterSchema = (input: Parameters<typeof executeFilterSchemaMigration>[0]) =>
  executeFilterSchemaMigration(input, new NodeFilterHashGenerator())

function condition(field: string, operator: string, value: string): FilterExpression {
  return {
    kind: 'condition',
    field,
    operator,
    effect: 'require',
    unknown: 'exclude',
    value: { kind: 'scalar', value },
  }
}

function semanticState(filter: FilterExpression): SavedFilterSemanticState {
  return { filter, textQuery: null, sort: [], projection: [] }
}

function migrationInput(
  migrations: readonly FilterSchemaMigrationStep[],
  overrides: Partial<FilterSchemaMigrationInput> = {}
): FilterSchemaMigrationInput {

  return {
    contextKey: 'work_item.discovery',
    contextOwner: 'tasks',
    fromVersion: 1,
    toVersion: 2,
    payload: semanticState(condition('legacy_status', 'eq', 'open')),
    inputChecksum: null,
    migrations,
    forwardReaders: [],
    ...overrides,
  }
}

function successfulPayload(
  result: ReturnType<typeof migrateFilterSchema>
): SavedFilterSemanticState {

  if (result.atomicPayload === null) {
    throw new Error(`Expected atomic payload, received ${result.outcome}`)
  }
  return parseSavedFilterSemanticState(result.atomicPayload.payloadJson)
}
test.group('Unit | Filter schema migration', () => {
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
