export const REVIEW_EVIDENCE_SUFFICIENCY_VALUES_V1 = [
  'pending',
  'adequate',
  'governed_exception',
  'inadequate',
] as const

export type ReviewEvidenceSufficiencyV1 =
  (typeof REVIEW_EVIDENCE_SUFFICIENCY_VALUES_V1)[number]
