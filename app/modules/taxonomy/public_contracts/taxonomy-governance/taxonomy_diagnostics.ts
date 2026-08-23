export type TaxonomyDiagnosticSeverity = 'info' | 'warning' | 'error'

export type TaxonomyDiagnosticCode =
  | 'active_term_has_replacement'
  | 'alias_collision'
  | 'ambiguous_alias'
  | 'canonical_ref_changed'
  | 'confidence_out_of_range'
  | 'cross_namespace_parent'
  | 'cross_namespace_replacement'
  | 'duplicate_ref'
  | 'duplicate_term_ref'
  | 'graph_cycle'
  | 'invalid_alias'
  | 'invalid_alias_kind'
  | 'invalid_alias_review_state'
  | 'invalid_assignment_provenance'
  | 'invalid_assignment_review_state'
  | 'invalid_label'
  | 'invalid_merge_replacement'
  | 'invalid_namespace'
  | 'invalid_term_id'
  | 'invalid_term_status'
  | 'invalid_validity_timestamp'
  | 'invalid_version'
  | 'merged_identity_reused'
  | 'missing_assignment_field'
  | 'missing_label'
  | 'locale_collision'
  | 'orphan_parent'
  | 'orphan_replacement'
  | 'self_replacement'
  | 'invalid_replacement_target'
  | 'retired_identity_reused'
  | 'validity_window_inverted'
  | 'version_not_advanced'

export interface TaxonomyDiagnostic {
  readonly code: TaxonomyDiagnosticCode
  readonly severity: TaxonomyDiagnosticSeverity
  readonly path: string
  readonly message: string
  readonly repairHint?: string
}

export const METADATA_KNOWLEDGE_STATES = [
  'known_present',
  'known_absent',
  'missing',
  'unknown',
  'unavailable',
  'stale',
  'unresolved',
  'not_applicable',
] as const
export type MetadataKnowledgeState = (typeof METADATA_KNOWLEDGE_STATES)[number]

export interface TaxonomyCompletenessReport {
  readonly resource: string
  readonly entityId: string
  readonly namespace: string
  readonly state: MetadataKnowledgeState
  readonly taxonomyVersion: number
  readonly enrichmentVersion?: number
  readonly projectedAt: string
  readonly unresolvedCount: number
  readonly belowThresholdCount: number
}

export interface ExternalTaxonomyCompleteness {
  readonly state: 'known_present' | 'known_absent' | 'unknown' | 'stale' | 'not_applicable'
}

export function createTaxonomyCompletenessReport(
  input: Omit<TaxonomyCompletenessReport, 'unresolvedCount' | 'belowThresholdCount'> & {
    readonly unresolvedCount?: number
    readonly belowThresholdCount?: number
  }
): TaxonomyCompletenessReport {
  return {
    ...input,
    unresolvedCount: requireNonNegativeCount(input.unresolvedCount ?? 0, 'unresolvedCount'),
    belowThresholdCount: requireNonNegativeCount(
      input.belowThresholdCount ?? 0,
      'belowThresholdCount'
    ),
  }
}

export function collapseCompletenessForExternalResponse(
  report: TaxonomyCompletenessReport
): ExternalTaxonomyCompleteness {
  switch (report.state) {
    case 'known_present':
    case 'known_absent':
    case 'stale':
    case 'not_applicable':
      return { state: report.state }
    case 'missing':
    case 'unknown':
    case 'unavailable':
    case 'unresolved':
      return { state: 'unknown' }
  }
}

function requireNonNegativeCount(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer`)
  }
  return value
}
