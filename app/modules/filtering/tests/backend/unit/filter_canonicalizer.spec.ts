import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

import {
  canonicalizeFilterExpression,
  serializeCanonicalFilterExpression,
} from '#modules/filtering/domain/filtering-core/filter_canonicalizer'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import { hashFilterExpression } from '#modules/filtering/domain/filtering-core/filter_hash'
import {
  canonicalEquivalenceCases,
  condition,
  idempotenceCases,
} from '#modules/filtering/tests/backend/fixtures/filter_semantic_cases'

const hashGenerator = {
  hash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
  },
}

const hashFilter = (expression: FilterExpression): string =>
  hashFilterExpression(expression, hashGenerator)

test.group('Filter AST canonicalization', () => {
  test('WP-01/WP-06 consume one canonical cross-runtime fixture with verified SHA-256', async ({
    assert,
  }) => {
    const fixtureUrl = new URL(
      '../../../../../../inertia/apps/shared/filtering/fixtures/filter_semantic_cases.json',
      import.meta.url
    )
    const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8')) as {
      fixtureVersion: number
      cases: Array<{
        name: string
        input: FilterExpression
        canonical: FilterExpression
        serialized: string
        sha256: string
      }>
    }

    assert.equal(fixture.fixtureVersion, 1)
    for (const semanticCase of fixture.cases) {
      assert.deepEqual(
        canonicalizeFilterExpression(semanticCase.input),
        semanticCase.canonical,
        semanticCase.name
      )
      assert.equal(
        serializeCanonicalFilterExpression(semanticCase.input),
        semanticCase.serialized,
        semanticCase.name
      )
      assert.equal(
        createHash('sha256').update(semanticCase.serialized).digest('hex'),
        semanticCase.sha256,
        semanticCase.name
      )
      assert.equal(hashFilter(semanticCase.input), semanticCase.sha256, semanticCase.name)
    }
  })

  test('AST-004 equivalent strict forms share canonical payload and hash', ({ assert }) => {
    for (const semanticCase of canonicalEquivalenceCases) {
      assert.equal(
        serializeCanonicalFilterExpression(semanticCase.left),
        serializeCanonicalFilterExpression(semanticCase.right),
        semanticCase.name
      )
      assert.equal(
        hashFilter(semanticCase.left),
        hashFilter(semanticCase.right),
        semanticCase.name
      )
    }
  })

  test('AST-005/016 canonical identity dedupes case variants and ignores harmless order', ({
    assert,
  }) => {
    const left = condition({
      value: { kind: 'set', values: ['Vue', 'typescript', 'VUE', 'TypeScript', 'postgresql'] },
    })
    const right = condition({
      value: { kind: 'set', values: ['POSTGRESQL', 'vue', 'TYPESCRIPT'] },
    })
    const canonical = canonicalizeFilterExpression(left)

    assert.deepEqual(canonical, {
      ...condition(),
      value: { kind: 'set', values: ['postgresql', 'typescript', 'vue'] },
    })
    assert.equal(hashFilter(left), hashFilter(right))
  })

  test('AST-016 is idempotent and produces a stable SHA-256 fixture', ({ assert }) => {
    for (const expression of idempotenceCases) {
      const once = canonicalizeFilterExpression(expression)
      const twice = canonicalizeFilterExpression(once)

      assert.deepEqual(twice, once)
      assert.equal(hashFilter(once), hashFilter(twice))
      assert.match(hashFilter(expression), /^[a-f0-9]{64}$/)
    }

    assert.equal(
      hashFilter(condition()),
      '9fabf1e47c98ee9bce7dad68cea5c8b344c4cece8002c4c507145a90325ea5f8'
    )
  })

  test('AST-003 sorts/dedupes group children but keeps relation and negation boundaries', ({
    assert,
  }) => {
    const relation = condition({
      field: 'applications',
      operator: 'related_matches',
      value: {
        kind: 'relation',
        expression: {
          kind: 'group',
          combinator: 'or',
          negated: true,
          children: [condition({ field: 'status' }), condition({ field: 'score' })],
        },
      },
    })
    const expression: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      children: [relation, condition({ field: 'skills' }), condition({ field: 'skills' })],
    }
    const canonical = canonicalizeFilterExpression(expression)

    assert.equal(canonical.kind, 'group')
    if (canonical.kind === 'group') {
      assert.lengthOf(canonical.children, 2)
      const canonicalRelation = canonical.children.find(
        (child) => child.kind === 'condition' && child.field === 'applications'
      )
      assert.equal(canonicalRelation?.kind, 'condition')
      if (canonicalRelation?.kind === 'condition') {
        assert.equal(canonicalRelation.operator, 'related_matches')
        assert.equal(canonicalRelation.value?.kind, 'relation')
        if (canonicalRelation.value?.kind === 'relation') {
          assert.equal(canonicalRelation.value.expression.kind, 'group')
          if (canonicalRelation.value.expression.kind === 'group') {
            assert.isTrue(canonicalRelation.value.expression.negated)
            assert.equal(canonicalRelation.value.expression.combinator, 'or')
          }
        }
      }
    }
  })

  test('preserves arbitrary scalar/range text while canonicalizing set and hierarchy identities', ({
    assert,
  }) => {
    assert.deepEqual(
      canonicalizeFilterExpression(
        condition({
          field: 'title',
          operator: 'exact',
          value: { kind: 'scalar', value: '  MiXeD İstanbul  ' },
        })
      ),
      condition({
        field: 'title',
        operator: 'exact',
        value: { kind: 'scalar', value: '  MiXeD İstanbul  ' },
      })
    )
    assert.deepEqual(
      canonicalizeFilterExpression(
        condition({
          field: 'createdAt',
          operator: 'between',
          value: {
            kind: 'range',
            gte: '2026-08-01T00:00:00+07:00',
            lte: '2026-08-02T00:00:00+07:00',
          },
        })
      ),
      condition({
        field: 'createdAt',
        operator: 'between',
        value: {
          kind: 'range',
          gte: '2026-08-01T00:00:00+07:00',
          lte: '2026-08-02T00:00:00+07:00',
        },
      })
    )
    assert.deepEqual(
      canonicalizeFilterExpression(
        condition({
          field: 'category',
          operator: 'within_subtree',
          value: {
            kind: 'hierarchy',
            termIds: [' Media:Film ', 'MEDIA:FILM', 'media:Book'],
            expansion: 'descendants',
          },
        })
      ),
      condition({
        field: 'category',
        operator: 'within_subtree',
        value: {
          kind: 'hierarchy',
          termIds: ['media:book', 'media:film'],
          expansion: 'descendants',
        },
      })
    )
  })

  test('pushes only proven total complements out of negated singleton groups', ({ assert }) => {
    const totalPredicate: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      negated: true,
      children: [
        {
          kind: 'condition',
          field: 'description',
          operator: 'exists',
          effect: 'require',
          unknown: 'include',
        },
      ],
    }
    assert.deepEqual(canonicalizeFilterExpression(totalPredicate), {
      kind: 'condition',
      field: 'description',
      operator: 'missing',
      effect: 'require',
      unknown: 'include',
    })

    const unknownSensitive: FilterExpression = {
      kind: 'group',
      combinator: 'and',
      negated: true,
      children: [condition({ field: 'skills', operator: 'contains_any', unknown: 'include' })],
    }
    const canonicalUnknownSensitive = canonicalizeFilterExpression(unknownSensitive)
    assert.equal(canonicalUnknownSensitive.kind, 'group')
    if (canonicalUnknownSensitive.kind === 'group') {
      assert.isTrue(canonicalUnknownSensitive.negated)
      assert.equal(canonicalUnknownSensitive.children[0]?.kind, 'condition')
    }
  })
})
