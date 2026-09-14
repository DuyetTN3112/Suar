import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type {
  AccomplishmentLifecycleStateV1,
  AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
export const CLAIM_LINK_TABLE = 'accomplishment_claim_links'
export const EVIDENCE_LINK_TABLE = 'accomplishment_evidence_links'
export const OBSERVATION_LINK_TABLE = 'accomplishment_review_observation_links'
export const SIGNAL_TABLE = 'accomplishment_capability_signals'
export const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
export const LOCK_TIMEOUT = '5000ms'

export interface AccomplishmentRow {
  id: string
  projection_key: string
  contract_version: number | string
  schema_version: string
  policy_version: string
  user_id: string
  organization_id: string | null
  project_id: string | null
  task_id: string
  task_assignment_id: string
  title: string
  concise_statement: string
  detailed_statement: string | null
  action: string
  object: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role: string | null
  ownership_level: string
  autonomy_level: string | null
  collaboration_type: string | null
  environment: string | null
  system_area: string | null
  scale_summary: string | null
  verification_method: string
  confidence_score: number | string | null
  confidence_band: string
  evidence_sufficiency: string
  canonical_hash: VerifiedWorkAccomplishmentV1['canonicalHash']
  canonical_payload: unknown
  lifecycle_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  provenance_class: string
  project_context_version_id: string | null
  work_package_version_id: string | null
  task_specification_version_id: string
  task_contract_version_id: string
  assignment_snapshot_id: string
  completion_report_id: string
  review_workflow_id: string
  task_specification_hash: string
  task_contract_hash: string
  assignment_snapshot_hash: string
  completion_report_hash: string
  review_hash: string | null
  verified_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

export interface LifecycleRow {
  id: string
  contract_version: number | string
  schema_version: string
  accomplishment_id: string
  sequence: number | string
  previous_state: AccomplishmentLifecycleStateV1 | null
  next_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  reason_code: AccomplishmentLifecycleRevisionV1['reasonCode']
  source_fact_id: string
  source_fact_type: AccomplishmentLifecycleRevisionV1['sourceFact']['type']
  source_fact_hash: string
  actor_type: AccomplishmentLifecycleRevisionV1['actor']['type']
  actor_user_id: string | null
  policy_version: string
  supersedes_revision_id: string | null
  related_accomplishment_id: string | null
  revision_payload: unknown
  occurred_at: Date | string
  created_at: Date | string
}

export interface ClaimLinkRow {
  accomplishment_id: string
  completion_claim_id: string
  subject_user_id: string
  claim_status: string
  ownership_level: string
  source_claim_hash: string
  schema_version: string
  claim_payload: unknown
  created_at: Date | string
}

export interface EvidenceLinkRow {
  accomplishment_id: string
  evidence_id: string
  completion_claim_id: string | null
  evidence_type: string
  access_classification: string
  availability: string
  content_hash: string | null
  schema_version: string
  evidence_payload: unknown
  created_at: Date | string
}

export interface ObservationLinkRow {
  accomplishment_id: string
  review_observation_id: string
  observation_revision_id: string
  observation_fact_id: string
  observation_type: string
  disposition: string
  governance_state: string
  source_observation_hash: string
  schema_version: string
  link_payload: unknown
  created_at: Date | string
}

export interface SignalRow {
  id: string
  projection_key: string
  contract_version: number | string
  schema_version: string
  policy_version: string
  accomplishment_id: string
  subject_user_id: string
  capability_id: string
  observed_behaviour: string
  observed_level_code: string | null
  assessment_ceiling_code: string
  direction: string
  applicability: string
  action: string
  object: string
  ownership_level: string
  complexity_summary: string | null
  confidence_score: number | string
  confidence_band: string
  signal_state: string
  evidence_reference_ids: unknown
  review_observation_ids: unknown
  source_observation_hash: string
  signal_payload: unknown
  observed_at: Date | string
  created_at: Date | string
}

export class VerifiedAccomplishmentProjectionCollisionException extends InvariantViolationException {
  constructor(projectionKey: string) {
    super(`Verified accomplishment projection key collision: ${projectionKey}`)
  }
}

export function setEquals(left: readonly string[], right: readonly string[]): boolean {
  const leftValues = [...new Set(left)].sort()
  const rightValues = [...new Set(right)].sort()
  return JSON.stringify(leftValues) === JSON.stringify(rightValues)
}

export function timestamp(value: string | null, field: string): Date | null {
  if (value === null) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvariantViolationException(`Verified accomplishment ${field} is invalid`)
  }
  return parsed
}
