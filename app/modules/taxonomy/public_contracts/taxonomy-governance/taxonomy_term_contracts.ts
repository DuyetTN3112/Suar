export const TAXONOMY_TERM_STATUSES = ['active', 'deprecated', 'retired', 'merged'] as const
export type TaxonomyTermStatus = (typeof TAXONOMY_TERM_STATUSES)[number]

export const TAXONOMY_ALIAS_KINDS = [
  'synonym',
  'abbreviation',
  'spelling',
  'translation',
  'legacy',
] as const
export type TaxonomyAliasKind = (typeof TAXONOMY_ALIAS_KINDS)[number]

export const TAXONOMY_ALIAS_REVIEW_STATES = ['reviewed', 'suggested'] as const
export type TaxonomyAliasReviewState = (typeof TAXONOMY_ALIAS_REVIEW_STATES)[number]

export interface TaxonomyTermRef {
  readonly namespace: string
  readonly termId: string
}

export interface TaxonomyAlias {
  readonly locale?: string
  readonly value: string
  readonly kind: TaxonomyAliasKind
  readonly reviewState: TaxonomyAliasReviewState
}

export interface TaxonomyTerm {
  readonly ref: TaxonomyTermRef
  readonly version: number
  readonly status: TaxonomyTermStatus
  readonly labels: Readonly<Record<string, string>>
  readonly aliases: readonly TaxonomyAlias[]
  readonly parentRefs: readonly TaxonomyTermRef[]
  readonly replacementRefs?: readonly TaxonomyTermRef[]
  readonly metadata?: Readonly<Record<string, string | number | boolean>>
}

export interface LocalizedTaxonomyLabel {
  readonly locale: string
  readonly value: string
  readonly usedFallback: boolean
}

export interface FreeFormTagScope {
  readonly resource: string
  readonly entityId: string
  readonly tagSpace: string
  readonly sourceType: string
  readonly sourceId?: string
}

export interface FreeFormTag extends FreeFormTagScope {
  readonly displayValue: string
  readonly normalizedValue: string
}

export const ASSIGNMENT_PROVENANCE_VALUES = [
  'explicit',
  'imported',
  'derived',
  'suggested',
] as const
export type AssignmentProvenance = (typeof ASSIGNMENT_PROVENANCE_VALUES)[number]

export const ASSIGNMENT_REVIEW_STATES = [
  'reviewed',
  'pending',
  'disputed',
  'rejected',
  'expired',
] as const
export type AssignmentReviewState = (typeof ASSIGNMENT_REVIEW_STATES)[number]

export interface EntityTaxonomyAssignment {
  readonly resource: string
  readonly entityId: string
  readonly term: TaxonomyTermRef
  readonly provenance: AssignmentProvenance
  readonly reviewState: AssignmentReviewState
  readonly confidence?: number
  readonly sourceType: string
  readonly sourceId?: string
  readonly evidenceRefs?: readonly string[]
  readonly validFrom?: string
  readonly validUntil?: string
  readonly taxonomyVersion: number
  readonly enrichmentVersion?: number
}

export function canonicalTaxonomyRef(ref: TaxonomyTermRef): string {
  return `${ref.namespace}:${ref.termId}`
}

export {
  TaxonomyGraphError,
  validateTaxonomyTermRef,
  validateTaxonomyTerm,
  validateTaxonomyGraph,
  buildTaxonomyAncestorPaths,
} from './taxonomy_graph_validator.js'
