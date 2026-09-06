import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  canonicalizeCriteriaFilter,
  parseCriteriaFilter,
  serializeCriteriaFilter,
} from '../criteria_codec'
import sharedFixtures from '../fixtures/filter_semantic_cases.json'

describe('filter contract fixtures', () => {
  it('consumes the frozen WP-01 JSON fixtures with exact canonical parity', () => {
    expect(sharedFixtures.fixtureVersion).toBe(1)
    for (const fixture of sharedFixtures.cases) {
      const input = parseCriteriaFilter(fixture.input)
      const expected = parseCriteriaFilter(fixture.canonical)
      expect(input, fixture.name).not.toBeNull()
      expect(expected, fixture.name).not.toBeNull()
      if (input === null || expected === null) continue

      expect(canonicalizeCriteriaFilter(input), fixture.name).toEqual(expected)
      expect(serializeCriteriaFilter(input), fixture.name).toBe(fixture.serialized)
      expect(
        createHash('sha256').update(fixture.serialized).digest('hex'),
        fixture.name
      ).toBe(fixture.sha256)
    }
  })

  it('round-trips every frozen fixture idempotently', () => {
    for (const fixture of sharedFixtures.cases) {
      const input = parseCriteriaFilter(structuredClone(fixture.input))
      expect(input, fixture.name).not.toBeNull()
      if (input === null) continue
      const once = canonicalizeCriteriaFilter(input)
      const parsedAgain = parseCriteriaFilter(structuredClone(once))
      expect(parsedAgain, fixture.name).not.toBeNull()
      if (parsedAgain === null) continue
      const twice = canonicalizeCriteriaFilter(parsedAgain)

      expect(twice).toEqual(once)
      expect(serializeCriteriaFilter(twice)).toBe(serializeCriteriaFilter(once))
    }
  })

  it.each([
    [
      'unary value',
      {
        kind: 'condition',
        field: 'status',
        operator: 'exists',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'scalar', value: true },
      },
    ],
    [
      'minimumMatch beyond unique values',
      {
        kind: 'condition',
        field: 'skills',
        operator: 'contains_at_least',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'set', values: ['Vue', 'vue'], minimumMatch: 2 },
      },
    ],
    [
      'empty or inverted range',
      {
        kind: 'condition',
        field: 'budget',
        operator: 'between',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'range', gte: 20, lte: 10 },
      },
    ],
    [
      'zero relative window',
      {
        kind: 'condition',
        field: 'createdAt',
        operator: 'within_last',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'relative_time', amount: 0, unit: 'day', anchor: 'now' },
      },
    ],
    [
      'empty hierarchy',
      {
        kind: 'condition',
        field: 'topics',
        operator: 'within_subtree',
        effect: 'require',
        unknown: 'exclude',
        value: { kind: 'hierarchy', termIds: [], expansion: 'descendants' },
      },
    ],
    [
      'inverted relation count',
      {
        kind: 'condition',
        field: 'applications',
        operator: 'related_matches',
        effect: 'require',
        unknown: 'exclude',
        value: {
          kind: 'relation',
          count: { gte: 3, lte: 1 },
          expression: {
            kind: 'condition',
            field: 'status',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'open' },
          },
        },
      },
    ],
    [
      'single-child group',
      {
        kind: 'group',
        combinator: 'and',
        children: [
          {
            kind: 'condition',
            field: 'status',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'open' },
          },
        ],
      },
    ],
  ])('rejects backend-invalid AST shape: %s', (_name, expression) => {
    expect(parseCriteriaFilter(expression)).toBeNull()
  })

  it('rejects cyclic ASTs without recursing or executing partial criteria', () => {
    const cyclic: Record<string, unknown> = {
      kind: 'group',
      combinator: 'and',
      children: [],
    }
    cyclic['children'] = [cyclic, cyclic]

    expect(parseCriteriaFilter(cyclic)).toBeNull()
  })
})
