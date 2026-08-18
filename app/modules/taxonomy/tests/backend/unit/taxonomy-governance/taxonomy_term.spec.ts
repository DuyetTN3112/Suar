import { test } from '@japa/runner'

import {
  buildTaxonomyAncestorPaths,
  canonicalTaxonomyRef,
  getTaxonomyReplacementDisposition,
  normalizeFreeFormTag,
  parseTaxonomyRef,
  selectTaxonomyTermLabel,
  validateTaxonomyGraph,
  validateTaxonomyTerm,
  TAXONOMY_TERM_STATUSES,
} from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import type { TaxonomyTerm } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import { validateTaxonomyTermTransition } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_version'

const terms: TaxonomyTerm[] = [
  {
    ref: { namespace: 'skills', termId: 'frontend' },
    version: 4,
    status: 'active',
    labels: { en: 'Frontend engineering', vi: 'Kỹ thuật frontend' },
    aliases: [
      {
        locale: 'en',
        value: 'FE',
        kind: 'abbreviation',
        reviewState: 'reviewed',
      },
    ],
    parentRefs: [
      { namespace: 'skills', termId: 'engineering' },
      { namespace: 'skills', termId: 'web' },
    ],
  },
  {
    ref: { namespace: 'skills', termId: 'engineering' },
    version: 4,
    status: 'active',
    labels: { en: 'Engineering' },
    aliases: [],
    parentRefs: [],
  },
  {
    ref: { namespace: 'skills', termId: 'web' },
    version: 4,
    status: 'active',
    labels: { en: 'Web' },
    aliases: [],
    parentRefs: [{ namespace: 'skills', termId: 'engineering' }],
  },
]

test.group('Taxonomy term contract', () => {
  test('keeps canonical identity namespaced and label fallback identity-neutral', ({ assert }) => {
    const term = required(terms[0])

    assert.equal(canonicalTaxonomyRef(term.ref), 'skills:frontend')
    assert.include(
      validateTaxonomyTerm({ ...term, ref: { namespace: 'skills', termId: '' } }).map(
        ({ code }) => code
      ),
      'invalid_term_id'
    )
    assert.deepEqual(parseTaxonomyRef('skills:frontend'), term.ref)
    assert.isNull(parseTaxonomyRef('skills'))
    assert.isNull(parseTaxonomyRef('skills:frontend:secret'))
    assert.deepEqual(selectTaxonomyTermLabel(term, 'vi-VN', 'en'), {
      locale: 'vi',
      value: 'Kỹ thuật frontend',
      usedFallback: true,
    })
    assert.deepEqual(selectTaxonomyTermLabel(term, 'fr', 'en'), {
      locale: 'en',
      value: 'Frontend engineering',
      usedFallback: true,
    })
    assert.deepEqual(
      selectTaxonomyTermLabel({ ...term, labels: { 'en-US': 'Frontend' } }, 'EN_us', 'vi'),
      { locale: 'en-US', value: 'Frontend', usedFallback: false }
    )
    assert.equal(canonicalTaxonomyRef(term.ref), 'skills:frontend')
  })

  test('preserves alias semantics and rejects normalized locale collisions', ({ assert }) => {
    const term: TaxonomyTerm = {
      ...required(terms[0]),
      aliases: [
        { locale: 'en', value: 'FE', kind: 'abbreviation', reviewState: 'reviewed' },
        { locale: 'en-US', value: ' fe ', kind: 'synonym', reviewState: 'suggested' },
      ],
    }

    const diagnostics = validateTaxonomyTerm(term)

    assert.include(
      diagnostics.map(({ code }) => code),
      'alias_collision'
    )
    assert.deepInclude(required(term.aliases[0]), {
      kind: 'abbreviation',
      reviewState: 'reviewed',
    })

    const graphDiagnostics = validateTaxonomyGraph([
      term,
      {
        ...required(terms[1]),
        aliases: [{ locale: 'en-GB', value: 'FE', kind: 'synonym', reviewState: 'reviewed' }],
      },
    ])
    assert.include(
      graphDiagnostics.map(({ code }) => code),
      'ambiguous_alias'
    )
    assert.include(
      validateTaxonomyGraph([term, { ...term }]).map(({ code }) => code),
      'duplicate_term_ref'
    )

    const invalidRuntimeTerm = {
      ...term,
      status: 'published',
      labels: { 'en-US': 'Frontend', 'EN_us': 'Duplicate locale' },
      aliases: [{ locale: 'en', value: 'FE', kind: 'nickname', reviewState: 'approved' }],
    } as unknown as TaxonomyTerm
    const runtimeCodes = validateTaxonomyTerm(invalidRuntimeTerm).map(({ code }) => code)
    assert.include(runtimeCodes, 'invalid_term_status')
    assert.include(runtimeCodes, 'invalid_alias_kind')
    assert.include(runtimeCodes, 'invalid_alias_review_state')
    assert.include(runtimeCodes, 'locale_collision')
  })

  test('reports deterministic merge replacement and ambiguous split repair', ({ assert }) => {
    const merged: TaxonomyTerm = {
      ...required(terms[0]),
      status: 'merged',
      replacementRefs: [{ namespace: 'skills', termId: 'web-engineering' }],
    }
    const split: TaxonomyTerm = {
      ...required(terms[0]),
      status: 'retired',
      replacementRefs: [
        { namespace: 'skills', termId: 'browser-engineering' },
        { namespace: 'skills', termId: 'frontend-platform' },
      ],
    }

    assert.deepEqual(getTaxonomyReplacementDisposition(merged), {
      kind: 'deterministic',
      replacement: { namespace: 'skills', termId: 'web-engineering' },
    })
    assert.deepEqual(getTaxonomyReplacementDisposition(split), {
      kind: 'requires_review',
      replacements: split.replacementRefs,
    })
    assert.deepEqual(TAXONOMY_TERM_STATUSES, ['active', 'deprecated', 'retired', 'merged'])
  })

  test('preserves all multi-parent paths and rejects cycle and orphan graphs', ({ assert }) => {
    assert.deepEqual(
      buildTaxonomyAncestorPaths(terms, [{ namespace: 'skills', termId: 'frontend' }]),
      [
        [
          { namespace: 'skills', termId: 'frontend' },
          { namespace: 'skills', termId: 'engineering' },
        ],
        [
          { namespace: 'skills', termId: 'frontend' },
          { namespace: 'skills', termId: 'web' },
          { namespace: 'skills', termId: 'engineering' },
        ],
      ]
    )

    const invalid = [
      ...terms,
      {
        ref: { namespace: 'skills', termId: 'cycle-a' },
        version: 4,
        status: 'active' as const,
        labels: { en: 'Cycle A' },
        aliases: [],
        parentRefs: [{ namespace: 'skills', termId: 'cycle-b' }],
      },
      {
        ref: { namespace: 'skills', termId: 'cycle-b' },
        version: 4,
        status: 'active' as const,
        labels: { en: 'Cycle B' },
        aliases: [],
        parentRefs: [{ namespace: 'skills', termId: 'cycle-a' }],
      },
      {
        ref: { namespace: 'skills', termId: 'orphan' },
        version: 4,
        status: 'active' as const,
        labels: { en: 'Orphan' },
        aliases: [],
        parentRefs: [{ namespace: 'skills', termId: 'missing-parent' }],
      },
    ]
    const diagnostics = validateTaxonomyGraph(invalid)

    assert.include(
      diagnostics.map(({ code }) => code),
      'graph_cycle'
    )
    assert.include(
      diagnostics.map(({ code }) => code),
      'orphan_parent'
    )

    const replacementTarget: TaxonomyTerm = {
      ...required(terms[1]),
      ref: { namespace: 'skills', termId: 'replacement' },
    }
    const inactiveReplacementTarget: TaxonomyTerm = {
      ...required(terms[1]),
      ref: { namespace: 'skills', termId: 'inactive-replacement' },
      status: 'retired',
    }
    const replacementViolations = validateTaxonomyGraph([
      ...terms,
      replacementTarget,
      inactiveReplacementTarget,
      {
        ...required(terms[0]),
        ref: { namespace: 'skills', termId: 'missing-replacement-owner' },
        status: 'retired',
        replacementRefs: [{ namespace: 'skills', termId: 'does-not-exist' }],
      },
      {
        ...required(terms[0]),
        ref: { namespace: 'skills', termId: 'self-replacement' },
        status: 'retired',
        replacementRefs: [{ namespace: 'skills', termId: 'self-replacement' }],
      },
      {
        ...required(terms[0]),
        ref: { namespace: 'skills', termId: 'cross-namespace-replacement' },
        status: 'merged',
        replacementRefs: [{ namespace: 'private-skills', termId: 'replacement' }],
      },
      {
        ...required(terms[0]),
        ref: { namespace: 'skills', termId: 'inactive-target-owner' },
        status: 'retired',
        replacementRefs: [inactiveReplacementTarget.ref],
      },
    ]).map(({ code }) => code)
    assert.include(replacementViolations, 'orphan_replacement')
    assert.include(replacementViolations, 'self_replacement')
    assert.include(replacementViolations, 'cross_namespace_replacement')
    assert.include(replacementViolations, 'invalid_replacement_target')
  })

  test('keeps retired identities terminal and rejects canonical ID reuse', ({ assert }) => {
    const previous: TaxonomyTerm = { ...required(terms[0]), status: 'retired' }
    const next: TaxonomyTerm = { ...required(terms[0]), version: 5, status: 'active' }

    assert.include(
      validateTaxonomyTermTransition(previous, next).map(({ code }) => code),
      'retired_identity_reused'
    )
  })

  test('normalizes free-form tags without inventing a canonical term reference', ({ assert }) => {
    assert.deepEqual(
      normalizeFreeFormTag('  Điện Ảnh 🎬  ', {
        resource: 'work',
        entityId: 'work-1',
        tagSpace: 'content.tags',
        sourceType: 'editorial',
      }),
      {
        resource: 'work',
        entityId: 'work-1',
        tagSpace: 'content.tags',
        sourceType: 'editorial',
        displayValue: 'Điện Ảnh 🎬',
        normalizedValue: 'điện ảnh 🎬',
      }
    )
  })
})

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected taxonomy fixture value')
  }
  return value
}
