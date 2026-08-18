import { test } from '@japa/runner'

import {
  classifyTaxonomyAssignmentValidity,
  validateTaxonomyAssignment,
  type EntityTaxonomyAssignment,
} from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_assignment'
import {
  collapseCompletenessForExternalResponse,
  createTaxonomyCompletenessReport,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'

function assignment(overrides: Partial<EntityTaxonomyAssignment> = {}): EntityTaxonomyAssignment {
  return {
    resource: 'talent',
    entityId: 'talent-1',
    term: { namespace: 'skills', termId: 'typescript' },
    provenance: 'explicit',
    reviewState: 'reviewed',
    sourceType: 'profile',
    taxonomyVersion: 7,
    ...overrides,
  }
}

test.group('Taxonomy assignment contract', () => {
  test('preserves multiple legitimate assignments and their provenance envelope', ({ assert }) => {
    const assignments: EntityTaxonomyAssignment[] = [
      assignment({ provenance: 'explicit' }),
      assignment({
        term: { namespace: 'skills', termId: 'adonisjs' },
        provenance: 'imported',
        reviewState: 'pending',
        confidence: 0.8,
      }),
      assignment({
        term: { namespace: 'skills', termId: 'backend' },
        provenance: 'derived',
        confidence: 0.95,
      }),
      assignment({
        term: { namespace: 'skills', termId: 'distributed-systems' },
        provenance: 'suggested',
        reviewState: 'disputed',
        confidence: 0.4,
      }),
    ]

    assert.lengthOf(assignments, 4)
    assert.deepEqual(
      assignments.map(({ term }) => term.termId),
      ['typescript', 'adonisjs', 'backend', 'distributed-systems']
    )
    assert.deepEqual(
      assignments.map(({ provenance }) => provenance),
      ['explicit', 'imported', 'derived', 'suggested']
    )
    assert.isUndefined(assignments[0]?.confidence)
  })

  test('rejects uncalibrated confidence and invalid or inverted validity windows', ({ assert }) => {
    const invalidConfidenceValues = [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]
    const inverted = validateTaxonomyAssignment(
      assignment({
        validFrom: '2026-08-02T00:00:00.000Z',
        validUntil: '2026-08-01T00:00:00.000Z',
      })
    )
    const invalidDate = validateTaxonomyAssignment(assignment({ validUntil: 'someday' }))
    const impossibleDate = validateTaxonomyAssignment(
      assignment({ validUntil: '2026-02-30T00:00:00.000Z' })
    )

    for (const confidence of invalidConfidenceValues) {
      assert.include(
        validateTaxonomyAssignment(assignment({ confidence })).map(({ code }) => code),
        'confidence_out_of_range'
      )
    }
    assert.include(
      inverted.map(({ code }) => code),
      'validity_window_inverted'
    )
    assert.include(
      invalidDate.map(({ code }) => code),
      'invalid_validity_timestamp'
    )
    assert.include(
      impossibleDate.map(({ code }) => code),
      'invalid_validity_timestamp'
    )

    const runtimeCodes = validateTaxonomyAssignment(
      assignment({
        term: { namespace: 'Bad Namespace', termId: 'invalid:id' },
        provenance: 'guessed' as EntityTaxonomyAssignment['provenance'],
        reviewState: 'approved' as EntityTaxonomyAssignment['reviewState'],
      })
    ).map(({ code }) => code)
    assert.include(runtimeCodes, 'invalid_namespace')
    assert.include(runtimeCodes, 'invalid_term_id')
    assert.include(runtimeCodes, 'invalid_assignment_provenance')
    assert.include(runtimeCodes, 'invalid_assignment_review_state')
  })

  test('classifies future, active, and expired assignments without rewriting review state', ({
    assert,
  }) => {
    const now = new Date('2026-08-01T12:00:00.000Z')

    assert.equal(
      classifyTaxonomyAssignmentValidity(
        assignment({ validFrom: '2026-08-02T00:00:00.000Z' }),
        now
      ),
      'not_yet_valid'
    )
    assert.equal(
      classifyTaxonomyAssignmentValidity(
        assignment({ validUntil: '2026-08-02T00:00:00.000Z' }),
        now
      ),
      'active'
    )
    const expired = assignment({
      reviewState: 'reviewed',
      validUntil: '2026-07-31T23:59:59.000Z',
    })
    assert.equal(classifyTaxonomyAssignmentValidity(expired, now), 'expired')
    assert.equal(expired.reviewState, 'reviewed')
  })

  test('keeps internal completeness distinctions and collapses private causes externally', ({
    assert,
  }) => {
    const report = createTaxonomyCompletenessReport({
      resource: 'talent',
      entityId: 'talent-1',
      namespace: 'skills',
      state: 'unavailable',
      taxonomyVersion: 7,
      projectedAt: '2026-08-01T00:00:00.000Z',
      unresolvedCount: 2,
    })

    assert.equal(report.state, 'unavailable')
    assert.equal(report.unresolvedCount, 2)
    assert.deepEqual(collapseCompletenessForExternalResponse(report), { state: 'unknown' })
    assert.deepEqual(collapseCompletenessForExternalResponse({ ...report, state: 'missing' }), {
      state: 'unknown',
    })
    assert.deepEqual(
      collapseCompletenessForExternalResponse({ ...report, state: 'not_applicable' }),
      { state: 'not_applicable' }
    )
    assert.deepEqual(
      ['unavailable', 'missing', 'unknown', 'unresolved'].map((state) =>
        collapseCompletenessForExternalResponse({
          ...report,
          state: state as 'unavailable' | 'missing' | 'unknown' | 'unresolved',
        })
      ),
      [{ state: 'unknown' }, { state: 'unknown' }, { state: 'unknown' }, { state: 'unknown' }]
    )
    assert.deepEqual(collapseCompletenessForExternalResponse({ ...report, state: 'stale' }), {
      state: 'stale',
    })
  })
})
