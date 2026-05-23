import { test } from '@japa/runner'

import {
  parseFilterQualifiers,
  type QualifierFieldDefinition,
} from '#modules/filtering/domain/filtering-core/filter_qualifier_parser'
import { serializeFilterQualifiers } from '#modules/filtering/domain/filtering-core/filter_qualifier_serializer'

const fields: Readonly<Record<string, QualifierFieldDefinition>> = {
  status: { type: 'scalar', operators: ['eq', 'in'] },
  skill: { type: 'multi_value', operators: ['contains_any', 'contains_all'] },
  trust: { type: 'number', operators: ['gte', 'lte'] },
}

test.group('Filter qualifier round trip', () => {
  test('round-trips representable criteria into deterministic qualifier text', ({ assert }) => {
    const source = {
      kind: 'group' as const,
      combinator: 'and' as const,
      children: [
        {
          kind: 'condition' as const,
          field: 'skill',
          operator: 'contains_any',
          effect: 'require' as const,
          unknown: 'exclude' as const,
          value: { kind: 'set' as const, values: ['postgresql', 'typescript'] },
        },
        {
          kind: 'condition' as const,
          field: 'status',
          operator: 'eq',
          effect: 'require' as const,
          unknown: 'exclude' as const,
          value: { kind: 'scalar' as const, value: 'in_progress' },
        },
        {
          kind: 'condition' as const,
          field: 'trust',
          operator: 'gte',
          effect: 'require' as const,
          unknown: 'exclude' as const,
          value: { kind: 'scalar' as const, value: 70 },
        },
      ],
    }

    const serialized = serializeFilterQualifiers(source)
    const parsed = parseFilterQualifiers(serialized, { allowedFields: fields })

    assert.equal(serialized, 'skill:(postgresql OR typescript) status:in_progress trust:>=70')
    assert.deepEqual(parsed.diagnostics, [])
    assert.deepEqual(parsed.expression, source)
    assert.equal(parsed.residualText, '')
  })

  test('keeps unsupported preference and relation expressions as visual chips', ({ assert }) => {
    const expression = {
      kind: 'condition' as const,
      field: 'status',
      operator: 'eq',
      effect: 'require' as const,
      unknown: 'include' as const,
      value: { kind: 'scalar' as const, value: 'todo' },
    }

    const result = serializeFilterQualifiers(expression, {
      unsupported: 'chip',
      unknownPolicy: 'chip',
    })

    assert.deepEqual(result, {
      text: 'status:todo',
      chips: [{ kind: 'unknown_policy', field: 'status' }],
    })
  })
})
