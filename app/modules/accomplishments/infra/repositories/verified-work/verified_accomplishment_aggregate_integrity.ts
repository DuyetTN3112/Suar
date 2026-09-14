import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  CLAIM_LINK_TABLE,
  EVIDENCE_LINK_TABLE,
  LIFECYCLE_TABLE,
  OBSERVATION_LINK_TABLE,
  SIGNAL_TABLE,
  VerifiedAccomplishmentProjectionCollisionException,
  setEquals,
  type AccomplishmentRow,
  type ClaimLinkRow,
  type EvidenceLinkRow,
  type LifecycleRow,
  type ObservationLinkRow,
  type SignalRow,
} from './verified_accomplishment_types.js'

import type {
  CreateVerifiedAccomplishmentAggregateInput,
  PersistedVerifiedAccomplishmentResult,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

function parsedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function exactJson(
  left: unknown,
  right: unknown,
  hasher: AccomplishmentContentHasher
): boolean {
  return hasher.hash({ value: parsedJson(left) }) === hasher.hash({ value: parsedJson(right) })
}

function exactTimestamp(left: Date | string, right: string): boolean {
  const leftDate = left instanceof Date ? left : new Date(left)
  const rightDate = new Date(right)
  return (
    !Number.isNaN(leftDate.getTime()) &&
    !Number.isNaN(rightDate.getTime()) &&
    leftDate.toISOString() === rightDate.toISOString()
  )
}

function exactNullableTimestamp(left: Date | string | null, right: string | null): boolean {
  if (left === null || right === null) return left === right
  return exactTimestamp(left, right)
}

function scalarColumnsMatchCanonical(
  row: AccomplishmentRow,
  accomplishment: VerifiedWorkAccomplishmentV1
): boolean {
  return (
    Number(row.contract_version) === accomplishment.contractVersion &&
    row.schema_version === 'suar.verified_work_accomplishment.v1' &&
    row.policy_version === accomplishment.provenance.policyVersion &&
    row.user_id === accomplishment.userId &&
    row.organization_id === accomplishment.organizationId &&
    row.project_id === accomplishment.projectId &&
    row.task_id === accomplishment.taskId &&
    row.task_assignment_id === accomplishment.taskAssignmentId &&
    row.title === accomplishment.title &&
    row.concise_statement === accomplishment.conciseStatement &&
    row.detailed_statement === accomplishment.detailedStatement &&
    row.action === accomplishment.action &&
    row.object === accomplishment.object &&
    row.task_type === accomplishment.taskType &&
    row.business_domain === accomplishment.businessDomain &&
    row.problem_category === accomplishment.problemCategory &&
    row.role === accomplishment.role &&
    row.ownership_level === accomplishment.ownershipLevel &&
    row.autonomy_level === accomplishment.autonomyLevel &&
    row.collaboration_type === accomplishment.collaborationType &&
    row.environment === accomplishment.context.environment &&
    row.system_area === accomplishment.context.systemArea &&
    row.scale_summary === accomplishment.context.scaleSummary &&
    row.verification_method === accomplishment.verification.method &&
    (row.confidence_score === null
      ? accomplishment.verification.confidenceScore === null
      : Number(row.confidence_score) === accomplishment.verification.confidenceScore) &&
    row.confidence_band === accomplishment.verification.confidenceBand &&
    row.evidence_sufficiency === accomplishment.verification.evidenceSufficiency &&
    row.lifecycle_state === accomplishment.lifecycleState &&
    row.visibility === accomplishment.visibility &&
    row.provenance_class === accomplishment.provenance.provenanceClass &&
    row.project_context_version_id === accomplishment.provenance.projectContextVersionId &&
    row.work_package_version_id === accomplishment.provenance.workPackageVersionId &&
    row.task_specification_version_id ===
      accomplishment.provenance.taskSpecificationVersionId &&
    row.task_contract_version_id === accomplishment.provenance.taskContractVersionId &&
    row.assignment_snapshot_id === accomplishment.provenance.assignmentSnapshotId &&
    row.completion_report_id === accomplishment.provenance.completionReportId &&
    row.review_workflow_id === accomplishment.provenance.reviewWorkflowId &&
    row.task_specification_hash === accomplishment.provenance.sourceHashes.taskSpecification &&
    row.task_contract_hash === accomplishment.provenance.sourceHashes.taskContract &&
    row.assignment_snapshot_hash === accomplishment.provenance.sourceHashes.assignmentSnapshot &&
    row.completion_report_hash === accomplishment.provenance.sourceHashes.completionReport &&
    row.review_hash === accomplishment.provenance.sourceHashes.review &&
    row.canonical_hash === accomplishment.canonicalHash &&
    exactNullableTimestamp(row.verified_at, accomplishment.verification.verifiedAt) &&
    exactTimestamp(row.created_at, accomplishment.createdAt) &&
    exactTimestamp(row.updated_at, accomplishment.updatedAt)
  )
}

export function resultFromRows(
  row: AccomplishmentRow,
  lifecycle: LifecycleRow,
  inserted: boolean
): PersistedVerifiedAccomplishmentResult {
  const sequence = Number(lifecycle.sequence)
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new PersistedDataIntegrityException(
      'Verified accomplishment lifecycle head sequence is corrupt',
      { accomplishmentId: row.id }
    )
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(row.canonical_hash)) {
    throw new PersistedDataIntegrityException(
      'Verified accomplishment canonical hash is corrupt',
      { accomplishmentId: row.id }
    )
  }
  return {
    inserted,
    accomplishmentId: row.id,
    projectionKey: row.projection_key,
    canonicalHash: row.canonical_hash as TvaSha256,
    lifecycleState: row.lifecycle_state,
    lifecycleRevisionId: lifecycle.id,
    lifecycleSequence: sequence,
  }
}

export async function loadLifecycleHead(
  trx: TransactionClientContract,
  accomplishmentId: string
): Promise<LifecycleRow> {
  const row = (await trx
    .from(LIFECYCLE_TABLE)
    .where('accomplishment_id', accomplishmentId)
    .orderBy('sequence', 'desc')
    .first()) as LifecycleRow | undefined
  if (!row) {
    throw new PersistedDataIntegrityException(
      'Verified accomplishment does not resolve to a lifecycle head',
      { accomplishmentId }
    )
  }
  return row
}

export async function assertExistingAggregate(
  trx: TransactionClientContract,
  row: AccomplishmentRow,
  input: CreateVerifiedAccomplishmentAggregateInput,
  hasher: AccomplishmentContentHasher
): Promise<LifecycleRow> {
  const stored = parseVerifiedWorkAccomplishmentV1(row.canonical_payload)
  const storedHash = hashVerifiedAccomplishmentPayload(stored, hasher)
  if (
    stored.canonicalHash !== row.canonical_hash ||
    storedHash !== row.canonical_hash ||
    !scalarColumnsMatchCanonical(row, stored)
  ) {
    throw new PersistedDataIntegrityException(
      'Stored verified accomplishment canonical payload, hash and scalar projection diverge',
      { accomplishmentId: row.id }
    )
  }
  if (
    row.id !== input.accomplishment.id ||
    row.canonical_hash !== input.accomplishment.canonicalHash ||
    row.lifecycle_state !== input.accomplishment.lifecycleState ||
    row.visibility !== input.accomplishment.visibility
  ) {
    throw new VerifiedAccomplishmentProjectionCollisionException(input.projectionKey)
  }

  const [claims, evidence, observations, signals, lifecycle] = await Promise.all([
    trx.from(CLAIM_LINK_TABLE).where('accomplishment_id', row.id).select('*') as Promise<
      ClaimLinkRow[]
    >,
    trx.from(EVIDENCE_LINK_TABLE).where('accomplishment_id', row.id).select('*') as Promise<
      EvidenceLinkRow[]
    >,
    trx.from(OBSERVATION_LINK_TABLE).where('accomplishment_id', row.id).select('*') as Promise<
      ObservationLinkRow[]
    >,
    trx.from(SIGNAL_TABLE).where('accomplishment_id', row.id).select('*') as Promise<SignalRow[]>,
    trx
      .from(LIFECYCLE_TABLE)
      .where('accomplishment_id', row.id)
      .orderBy('sequence', 'asc') as Promise<LifecycleRow[]>,
  ])
  const structurallyComplete =
    claims.length === input.claimLinks.length &&
    evidence.length === input.evidenceLinks.length &&
    observations.length === input.reviewObservationLinks.length &&
    signals.length === input.capabilitySignals.length &&
    lifecycle.length === input.lifecycleRevisions.length &&
    setEquals(
      claims.map((item) => item.completion_claim_id),
      input.claimLinks.map(({ claim }) => claim.id)
    ) &&
    setEquals(
      observations.map((item) => item.review_observation_id),
      input.reviewObservationLinks.map(({ reviewObservationId }) => reviewObservationId)
    ) &&
    setEquals(
      signals.map((item) => item.id),
      input.capabilitySignals.map(({ signal }) => signal.id)
    )
  if (!structurallyComplete) {
    throw new PersistedDataIntegrityException(
      'Stored verified accomplishment aggregate is incomplete',
      { accomplishmentId: row.id }
    )
  }
  const exactProvenance =
    input.claimLinks.every((link) =>
      claims.some(
        (rowLink) =>
          rowLink.accomplishment_id === row.id &&
          rowLink.completion_claim_id === link.claim.id &&
          rowLink.subject_user_id === input.accomplishment.userId &&
          rowLink.claim_status === link.projectedClaimStatus &&
          rowLink.ownership_level === link.projectedOwnershipLevel &&
          rowLink.source_claim_hash === link.sourceClaimHash &&
          rowLink.schema_version === 'suar.accomplishment_claim_link.v1' &&
          exactJson(rowLink.claim_payload, link.claim, hasher) &&
          exactTimestamp(rowLink.created_at, input.accomplishment.createdAt)
      )
    ) &&
    input.evidenceLinks.every((link) =>
      evidence.some(
        (rowLink) =>
          rowLink.accomplishment_id === row.id &&
          rowLink.evidence_id === link.evidenceId &&
          rowLink.completion_claim_id === link.completionClaimId &&
          rowLink.evidence_type === link.evidenceType &&
          rowLink.access_classification === link.accessClassification &&
          rowLink.availability === link.availability &&
          rowLink.content_hash === link.contentHash &&
          rowLink.schema_version === 'suar.accomplishment_evidence_link.v1' &&
          exactJson(rowLink.evidence_payload, link.evidencePayload, hasher) &&
          exactTimestamp(rowLink.created_at, input.accomplishment.createdAt)
      )
    ) &&
    input.reviewObservationLinks.every((link) =>
      observations.some(
        (rowLink) =>
          rowLink.accomplishment_id === row.id &&
          rowLink.review_observation_id === link.reviewObservationId &&
          rowLink.observation_revision_id === link.observationRevisionId &&
          rowLink.observation_fact_id === link.observationFactId &&
          rowLink.observation_type === link.observationType &&
          rowLink.disposition === link.disposition &&
          rowLink.governance_state === link.governanceState &&
          rowLink.source_observation_hash === link.sourceObservationHash &&
          rowLink.schema_version === 'suar.accomplishment_review_observation_link.v1' &&
          exactJson(rowLink.link_payload, link.linkPayload, hasher) &&
          exactTimestamp(rowLink.created_at, input.accomplishment.createdAt)
      )
    ) &&
    input.capabilitySignals.every((link) =>
      signals.some(
        (rowLink) =>
          rowLink.id === link.signal.id &&
          rowLink.projection_key === link.projectionKey &&
          Number(rowLink.contract_version) === link.signal.contractVersion &&
          rowLink.schema_version === 'suar.accomplishment_capability_signal.v1' &&
          rowLink.policy_version === link.signal.policyVersion &&
          rowLink.accomplishment_id === row.id &&
          rowLink.subject_user_id === link.signal.subjectUserId &&
          rowLink.capability_id === link.signal.capabilityId &&
          rowLink.observed_behaviour === link.signal.observedBehaviour &&
          rowLink.observed_level_code === link.signal.observedLevelCode &&
          rowLink.assessment_ceiling_code === link.signal.assessmentCeilingCode &&
          rowLink.direction === link.signal.direction &&
          rowLink.applicability === link.signal.applicability &&
          rowLink.action === link.signal.context.action &&
          rowLink.object === link.signal.context.object &&
          rowLink.ownership_level === link.signal.context.ownershipLevel &&
          rowLink.complexity_summary === link.signal.context.complexitySummary &&
          Number(rowLink.confidence_score) === link.signal.confidenceScore &&
          rowLink.confidence_band === link.signal.confidenceBand &&
          rowLink.signal_state === link.signal.signalState &&
          exactJson(rowLink.evidence_reference_ids, link.signal.evidenceReferences, hasher) &&
          exactJson(rowLink.review_observation_ids, link.signal.reviewObservationIds, hasher) &&
          rowLink.source_observation_hash === link.sourceObservationHash &&
          exactJson(rowLink.signal_payload, link.signal, hasher) &&
          exactTimestamp(rowLink.observed_at, link.signal.observedAt) &&
          exactTimestamp(rowLink.created_at, input.accomplishment.createdAt)
      )
    ) &&
    input.lifecycleRevisions.every((revision) =>
      lifecycle.some(
        (rowRevision) =>
          rowRevision.id === revision.id &&
          Number(rowRevision.contract_version) === revision.contractVersion &&
          rowRevision.schema_version === 'suar.accomplishment_lifecycle_revision.v1' &&
          rowRevision.accomplishment_id === row.id &&
          Number(rowRevision.sequence) === revision.sequence &&
          rowRevision.previous_state === revision.previousState &&
          rowRevision.next_state === revision.nextState &&
          rowRevision.visibility === revision.visibility &&
          rowRevision.reason_code === revision.reasonCode &&
          rowRevision.source_fact_id === revision.sourceFact.id &&
          rowRevision.source_fact_type === revision.sourceFact.type &&
          rowRevision.source_fact_hash === revision.sourceFact.hash &&
          rowRevision.actor_type === revision.actor.type &&
          rowRevision.actor_user_id === revision.actor.userId &&
          rowRevision.policy_version === revision.policyVersion &&
          rowRevision.supersedes_revision_id === revision.supersedesRevisionId &&
          rowRevision.related_accomplishment_id === revision.relatedAccomplishmentId &&
          exactJson(rowRevision.revision_payload, revision, hasher) &&
          exactTimestamp(rowRevision.occurred_at, revision.occurredAt) &&
          exactTimestamp(rowRevision.created_at, revision.occurredAt)
      )
    )
  if (!exactProvenance) {
    throw new VerifiedAccomplishmentProjectionCollisionException(input.projectionKey)
  }
  return loadLifecycleHead(trx, row.id)
}
