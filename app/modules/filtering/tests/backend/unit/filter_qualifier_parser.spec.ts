import { test } from '@japa/runner'

import {
  parseFilterQualifiers,
  type QualifierFieldDefinition,
} from '#modules/filtering/domain/filtering-core/filter_qualifier_parser'

const fields: Readonly<Record<string, QualifierFieldDefinition>> = {
  type: { type: 'scalar', operators: ['eq', 'in'] },
  skill: { type: 'multi_value', operators: ['contains_any', 'contains_all'] },
  domain: { type: 'scalar', operators: ['eq', 'in'] },
  status: { type: 'scalar', operators: ['eq', 'in'] },
  trust: { type: 'number', operators: ['gte', 'lte', 'lt', 'eq'] },
  updated: { type: 'date_time', operators: ['gte', 'lte', 'eq'] },
  assignee: { type: 'scalar', operators: ['eq'] },
  tag: { type: 'multi_value', operators: ['contains_any'] },
}

const options = { allowedFields: fields, maxLength: 512, maxDepth: 5, maxConditions: 20 }

test.group('Filter qualifier parser', () => {
  test('parses qualifiers and leaves retrieval text as residual text', ({ assert }) => {
    const result = parseFilterQualifiers(
      'type:task skill:"PostgreSQL" domain:fintech "alias cutover"',
      options
    )

    assert.deepEqual(result.diagnostics, [])
    assert.equal(result.residualText, 'alias cutover')
    assert.deepEqual(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'type',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 'task' },
        },
        {
          kind: 'condition',
          field: 'skill',
          operator: 'contains_any',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['PostgreSQL'] },
        },
        {
          kind: 'condition',
          field: 'domain',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 'fintech' },
        },
      ],
    })
  })

  test('parses exclusions, comparisons, @me, repeated values, and Boolean groups', ({ assert }) => {
    const result = parseFilterQualifiers(
      'assignee:@me status:(todo OR in_progress) -tag:legacy trust:>=70',
      options
    )

    assert.deepEqual(result.diagnostics, [])
    assert.equal(result.residualText, '')
    assert.deepEqual(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'assignee',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: '@me' },
        },
        {
          kind: 'group',
          combinator: 'or',
          children: [
            {
              kind: 'condition',
              field: 'status',
              operator: 'eq',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 'todo' },
            },
            {
              kind: 'condition',
              field: 'status',
              operator: 'eq',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 'in_progress' },
            },
          ],
        },
        {
          kind: 'condition',
          field: 'tag',
          operator: 'contains_none',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'set', values: ['legacy'] },
        },
        {
          kind: 'condition',
          field: 'trust',
          operator: 'gte',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 70 },
        },
      ],
    })
  })

  test('reports exact diagnostics for unknown fields and malformed grouping', ({ assert }) => {
    const result = parseFilterQualifiers('secret:value status:(todo OR', options)

    assert.equal(result.expression, undefined)
    assert.equal(result.residualText, '')
    assert.lengthOf(result.diagnostics, 2)
    assert.equal(result.diagnostics[0]?.code, 'QUALIFIER_UNKNOWN_FIELD')
    assert.equal(result.diagnostics[1]?.code, 'QUALIFIER_UNBALANCED_PAREN')
    assert.isAtLeast(result.diagnostics[0]?.start ?? -1, 0)
    assert.isAbove(result.diagnostics[0]?.end ?? 0, result.diagnostics[0]?.start ?? 0)
  })

  test('rejects oversized input and unsupported operators without broadening', ({ assert }) => {
    const result = parseFilterQualifiers('status:regex(todo) ' + 'x'.repeat(20), {
      ...options,
      maxLength: 20,
    })

    assert.equal(result.expression, undefined)
    assert.equal(result.residualText, '')
    assert.equal(result.diagnostics[0]?.code, 'QUALIFIER_INPUT_TOO_LONG')
  })

  test('preserves escaped phrases and parses numeric/date range bounds', ({ assert }) => {
    const result = parseFilterQualifiers(
      'updated:>=2026-07-01 trust:-10 trust:<80 project:"Search \\"Center\\""',
      { ...options, allowedFields: { ...fields, project: { type: 'text', operators: ['exact'] } } }
    )

    assert.deepEqual(result.diagnostics, [])
    assert.equal(result.residualText, '')
    assert.deepEqual(result.expression, {
      kind: 'group',
      combinator: 'and',
      children: [
        {
          kind: 'condition',
          field: 'updated',
          operator: 'gte',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: '2026-07-01T00:00:00.000Z' },
        },
        {
          kind: 'condition',
          field: 'trust',
          operator: 'eq',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: -10 },
        },
        {
          kind: 'condition',
          field: 'trust',
          operator: 'lt',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 80 },
        },
        {
          kind: 'condition',
          field: 'project',
          operator: 'exact',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'scalar', value: 'Search "Center"' },
        },
      ],
    })
  })
})
