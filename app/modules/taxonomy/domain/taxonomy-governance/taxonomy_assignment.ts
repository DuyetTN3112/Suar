import { DateTime } from 'luxon'

import { validateTaxonomyTermRef } from './taxonomy_term.js'

import type { TaxonomyDiagnostic } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'
import type { EntityTaxonomyAssignment } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

export type { EntityTaxonomyAssignment }

const provenances = ['explicit', 'imported', 'derived', 'suggested'] as const
const reviewStates = ['reviewed', 'pending', 'disputed', 'rejected', 'expired'] as const

const diagnostic = (code: TaxonomyDiagnostic['code'], path: string, message: string): TaxonomyDiagnostic => ({
  code, severity: 'error', path, message,
})

export function validateTaxonomyAssignment(assignment: EntityTaxonomyAssignment): TaxonomyDiagnostic[] {
  const diagnostics: TaxonomyDiagnostic[] = []
  diagnostics.push(...validateTaxonomyTermRef(assignment.term, 'term'))
  if (!provenances.includes(assignment.provenance)) diagnostics.push(diagnostic('invalid_assignment_provenance', 'provenance', 'Unsupported provenance'))
  if (!reviewStates.includes(assignment.reviewState)) diagnostics.push(diagnostic('invalid_assignment_review_state', 'reviewState', 'Unsupported review state'))
  if (assignment.confidence !== undefined && (!Number.isFinite(assignment.confidence) || assignment.confidence < 0 || assignment.confidence > 1)) diagnostics.push(diagnostic('confidence_out_of_range', 'confidence', 'Confidence must be between zero and one'))
  const dates = [assignment.validFrom, assignment.validUntil].map((value) =>
    value === undefined ? undefined : DateTime.fromISO(value, { setZone: true })
  )
  for (const [index, value] of dates.entries()) {
    if (value !== undefined && !value.isValid) {
      diagnostics.push(
        diagnostic(
          'invalid_validity_timestamp',
          index === 0 ? 'validFrom' : 'validUntil',
          'Validity timestamp must be an ISO date'
        )
      )
    }
  }
  if (dates[0]?.isValid && dates[1]?.isValid && dates[0] > dates[1]) {
    diagnostics.push(diagnostic('validity_window_inverted', 'validUntil', 'Validity window is inverted'))
  }
  return diagnostics
}

export function classifyTaxonomyAssignmentValidity(assignment: EntityTaxonomyAssignment, now = new Date()): 'not_yet_valid' | 'active' | 'expired' {
  const timestamp = now.getTime()
  if (assignment.validFrom && Date.parse(assignment.validFrom) > timestamp) return 'not_yet_valid'
  if (assignment.validUntil && Date.parse(assignment.validUntil) <= timestamp) return 'expired'
  return 'active'
}
