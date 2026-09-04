export interface NativeDeliverable {
  id: string
  title: string
  description?: string | null
}

export interface NativeCriterion {
  id: string
  statement: string
  critical?: boolean
}

export interface NativeEvidenceRequirement {
  id: string
  title: string
  description?: string | null
  criterionIds?: readonly string[]
  deliverableIds?: readonly string[]
  required?: boolean
  privacyClassification?: string | null
}

export interface NativeCompletionBrief {
  state?: 'legacy' | 'draft' | 'published' | 'restricted'
  audience?: string | null
  resolutionSource?: string | null
  restrictionCode?: string | null
  assignmentId?: string | null
  assignmentSnapshotId?: string | null
  assignmentSnapshotHash?: string | null
  contractVersionId?: string | null
  acknowledgementRequired?: boolean
  acknowledgementState?:
    | 'not_required'
    | 'pending'
    | 'acknowledged'
    | 'clarification_requested'
    | null
  resolvedContract?: {
    title?: string | null
    work?: {
      action?: string | null
      object?: string | null
      roleInTask?: string | null
      ownershipLevel?: string | null
      autonomyLevel?: string | null
      deliverables?: readonly NativeDeliverable[]
      acceptanceCriteria?: readonly NativeCriterion[]
    } | null
    evidence?: {
      requirements?: readonly NativeEvidenceRequirement[]
    } | null
  } | null
}

export type NativeCompletionReportTranslate = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string
