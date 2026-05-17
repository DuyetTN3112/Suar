import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CreateVerifiedAccomplishmentAggregateInput,
  PersistedVerifiedAccomplishmentResult,
  VerifiedAccomplishmentWriter,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import { validateAccomplishmentLifecycleTransition } from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import {
  type AccomplishmentLifecycleStateV1,
  type AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import {
  parseAccomplishmentLifecycleRevisionV1,
  type AccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isCompletionClaimV1 } from '#modules/tasks/public_contracts/task-authoring/validators'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
const CLAIM_LINK_TABLE = 'accomplishment_claim_links'
const EVIDENCE_LINK_TABLE = 'accomplishment_evidence_links'
const OBSERVATION_LINK_TABLE = 'accomplishment_review_observation_links'
const SIGNAL_TABLE = 'accomplishment_capability_signals'
const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
const LOCK_TIMEOUT = '5000ms'

interface AccomplishmentRow {
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

interface LifecycleRow {
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

interface ClaimLinkRow {
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

interface EvidenceLinkRow {
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

interface ObservationLinkRow {
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

interface SignalRow {
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

function setEquals(left: readonly string[], right: readonly string[]): boolean {
  const leftValues = [...new Set(left)].sort()
  const rightValues = [...new Set(right)].sort()
  return JSON.stringify(leftValues) === JSON.stringify(rightValues)
}

function timestamp(value: string | null, field: string): Date | null {
  if (value === null) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvariantViolationException(`Verified accomplishment ${field} is invalid`)
  }
  return parsed
}

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

function assertAggregateInput(
  input: CreateVerifiedAccomplishmentAggregateInput,
  hasher: AccomplishmentContentHasher
): {
  accomplishment: VerifiedWorkAccomplishmentV1
  lifecycle: AccomplishmentLifecycleRevisionV1[]
} {
  const accomplishment = parseVerifiedWorkAccomplishmentV1(input.accomplishment)
  if (!input.projectionKey.trim() || input.projectionKey.length > 255) {
    throw new InvariantViolationException('Verified accomplishment projection key is invalid')
  }
  if (!['verified', 'partially_verified'].includes(accomplishment.lifecycleState)) {
    throw new InvariantViolationException(
      'Verified accomplishment writer only accepts governed verified output'
    )
  }
  const computedHash = hashVerifiedAccomplishmentPayload(accomplishment, hasher)
  if (computedHash !== accomplishment.canonicalHash) {
    throw new InvariantViolationException(
      'Verified accomplishment canonical hash does not match its canonical payload'
    )
  }

  const claimIds = input.claimLinks.map(({ claim }) => claim.id)
  if (
    new Set(claimIds).size !== claimIds.length ||
    !setEquals(claimIds, accomplishment.provenance.completionClaimIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment claim links must exactly match canonical provenance'
    )
  }
  for (const link of input.claimLinks) {
    if (
      !isCompletionClaimV1(link.claim) ||
      link.claim.userId !== accomplishment.userId ||
      link.claim.completionReportId !== accomplishment.provenance.completionReportId ||
      link.claim.assignmentSnapshotId !== accomplishment.provenance.assignmentSnapshotId ||
      link.projectedOwnershipLevel !== accomplishment.ownershipLevel ||
      (link.projectedClaimStatus === 'verified') !==
        (accomplishment.lifecycleState === 'verified')
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment claim link crosses its canonical boundary'
      )
    }
  }

  const evidenceIds = input.evidenceLinks.map(({ evidenceId }) => evidenceId)
  if (
    new Set(evidenceIds).size !== evidenceIds.length ||
    !setEquals(
      evidenceIds,
      accomplishment.evidenceReferences.map(({ evidenceId }) => evidenceId)
    ) ||
    input.evidenceLinks.some(
      ({ completionClaimId }) => completionClaimId !== null && !claimIds.includes(completionClaimId)
    )
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment evidence links cross the claim or canonical boundary'
    )
  }
  for (const link of input.evidenceLinks) {
    const canonical = accomplishment.evidenceReferences.find(
      ({ evidenceId }) => evidenceId === link.evidenceId
    )
    if (
      !canonical ||
      canonical.evidenceType !== link.evidenceType ||
      canonical.accessClassification !== link.accessClassification ||
      canonical.availability !== link.availability ||
      canonical.contentHash !== link.contentHash
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment evidence metadata contradicts canonical provenance'
      )
    }
  }

  const observationIds = input.reviewObservationLinks.map(({ reviewObservationId }) =>
    reviewObservationId
  )
  if (
    new Set(observationIds).size !== observationIds.length ||
    !setEquals(observationIds, accomplishment.provenance.reviewObservationIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment observation links must exactly match canonical provenance'
    )
  }

  const signalIds = input.capabilitySignals.map(({ signal }) => signal.id)
  if (
    new Set(signalIds).size !== signalIds.length ||
    !setEquals(signalIds, accomplishment.capabilitySignalIds)
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment capability signals must exactly match canonical references'
    )
  }
  for (const inputSignal of input.capabilitySignals) {
    const signal = parseAccomplishmentCapabilitySignalV1(inputSignal.signal)
    const linkedObservationHashes = signal.reviewObservationIds.map((observationId) =>
      input.reviewObservationLinks.find(
        ({ reviewObservationId }) => reviewObservationId === observationId
      )?.sourceObservationHash
    )
    if (
      signal.accomplishmentId !== accomplishment.id ||
      signal.subjectUserId !== accomplishment.userId ||
      signal.context.action !== accomplishment.action ||
      signal.context.object !== accomplishment.object ||
      signal.context.ownershipLevel !== accomplishment.ownershipLevel ||
      signal.signalState !== 'active' ||
      !signal.reviewObservationIds.every((id) => observationIds.includes(id)) ||
      !signal.evidenceReferences.every((id) => evidenceIds.includes(id)) ||
      linkedObservationHashes.some((hash) => hash !== inputSignal.sourceObservationHash)
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment capability signal crosses its source boundary'
      )
    }
  }

  const lifecycle = input.lifecycleRevisions
    .map((revision) => parseAccomplishmentLifecycleRevisionV1(revision))
    .sort((left, right) => left.sequence - right.sequence)
  if (lifecycle.length === 0) {
    throw new InvariantViolationException(
      'Verified accomplishment requires an immutable lifecycle history'
    )
  }
  for (let index = 0; index < lifecycle.length; index += 1) {
    const revision = lifecycle[index]
    const previous = index === 0 ? null : lifecycle[index - 1]
    if (
      !revision ||
      revision.accomplishmentId !== accomplishment.id ||
      revision.sequence !== index + 1 ||
      revision.previousState !== (previous?.nextState ?? null) ||
      !validateAccomplishmentLifecycleTransition({
        previousState: revision.previousState,
        nextState: revision.nextState,
        previousVisibility: previous?.visibility ?? null,
        nextVisibility: revision.visibility,
        reasonCode: revision.reasonCode,
      }).allowed
    ) {
      throw new InvariantViolationException(
        'Verified accomplishment lifecycle history is not continuous or governed'
      )
    }
  }
  const finalRevision = lifecycle.at(-1)
  if (
    !finalRevision ||
    finalRevision.nextState !== accomplishment.lifecycleState ||
    finalRevision.visibility !== accomplishment.visibility
  ) {
    throw new InvariantViolationException(
      'Verified accomplishment lifecycle head does not match its canonical payload'
    )
  }
  return { accomplishment, lifecycle }
}

function resultFromRows(
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

async function loadLifecycleHead(
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

async function assertExistingAggregate(
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

async function insertAggregate(
  trx: TransactionClientContract,
  input: CreateVerifiedAccomplishmentAggregateInput,
  accomplishment: VerifiedWorkAccomplishmentV1,
  lifecycle: readonly AccomplishmentLifecycleRevisionV1[]
): Promise<{ row: AccomplishmentRow; lifecycleHead: LifecycleRow }> {
  const rows = (await trx
    .table(ACCOMPLISHMENT_TABLE)
    .insert({
      id: accomplishment.id,
      projection_key: input.projectionKey,
      contract_version: accomplishment.contractVersion,
      schema_version: 'suar.verified_work_accomplishment.v1',
      policy_version: accomplishment.provenance.policyVersion,
      user_id: accomplishment.userId,
      organization_id: accomplishment.organizationId,
      project_id: accomplishment.projectId,
      task_id: accomplishment.taskId,
      task_assignment_id: accomplishment.taskAssignmentId,
      title: accomplishment.title,
      concise_statement: accomplishment.conciseStatement,
      detailed_statement: accomplishment.detailedStatement,
      action: accomplishment.action,
      object: accomplishment.object,
      task_type: accomplishment.taskType,
      business_domain: accomplishment.businessDomain,
      problem_category: accomplishment.problemCategory,
      role: accomplishment.role,
      ownership_level: accomplishment.ownershipLevel,
      autonomy_level: accomplishment.autonomyLevel,
      collaboration_type: accomplishment.collaborationType,
      environment: accomplishment.context.environment,
      system_area: accomplishment.context.systemArea,
      scale_summary: accomplishment.context.scaleSummary,
      verification_method: accomplishment.verification.method,
      confidence_score: accomplishment.verification.confidenceScore,
      confidence_band: accomplishment.verification.confidenceBand,
      evidence_sufficiency: accomplishment.verification.evidenceSufficiency,
      lifecycle_state: accomplishment.lifecycleState,
      visibility: accomplishment.visibility,
      provenance_class: accomplishment.provenance.provenanceClass,
      project_context_version_id: accomplishment.provenance.projectContextVersionId,
      work_package_version_id: accomplishment.provenance.workPackageVersionId,
      task_specification_version_id: accomplishment.provenance.taskSpecificationVersionId,
      task_contract_version_id: accomplishment.provenance.taskContractVersionId,
      assignment_snapshot_id: accomplishment.provenance.assignmentSnapshotId,
      completion_report_id: accomplishment.provenance.completionReportId,
      review_workflow_id: accomplishment.provenance.reviewWorkflowId,
      task_specification_hash: accomplishment.provenance.sourceHashes.taskSpecification,
      task_contract_hash: accomplishment.provenance.sourceHashes.taskContract,
      assignment_snapshot_hash: accomplishment.provenance.sourceHashes.assignmentSnapshot,
      completion_report_hash: accomplishment.provenance.sourceHashes.completionReport,
      review_hash: accomplishment.provenance.sourceHashes.review,
      canonical_hash: accomplishment.canonicalHash,
      canonical_payload: JSON.stringify(accomplishment),
      verified_at: timestamp(accomplishment.verification.verifiedAt, 'verified timestamp'),
      created_at: timestamp(accomplishment.createdAt, 'created timestamp'),
      updated_at: timestamp(accomplishment.updatedAt, 'updated timestamp'),
    })
    .returning('*')) as AccomplishmentRow[]
  const row = rows[0]
  if (!row) {
    throw new InvariantViolationException('Verified accomplishment insert returned no row')
  }

  if (input.claimLinks.length > 0) {
    await trx.table(CLAIM_LINK_TABLE).multiInsert(
      input.claimLinks.map((link) => ({
        accomplishment_id: accomplishment.id,
        completion_claim_id: link.claim.id,
        subject_user_id: accomplishment.userId,
        claim_status: link.projectedClaimStatus,
        ownership_level: link.projectedOwnershipLevel,
        source_claim_hash: link.sourceClaimHash,
        schema_version: 'suar.accomplishment_claim_link.v1',
        claim_payload: JSON.stringify(link.claim),
        created_at: timestamp(accomplishment.createdAt, 'created timestamp'),
      }))
    )
  }
  if (input.evidenceLinks.length > 0) {
    await trx.table(EVIDENCE_LINK_TABLE).multiInsert(
      input.evidenceLinks.map((link) => ({
        accomplishment_id: accomplishment.id,
        evidence_id: link.evidenceId,
        completion_claim_id: link.completionClaimId,
        evidence_type: link.evidenceType,
        access_classification: link.accessClassification,
        availability: link.availability,
        content_hash: link.contentHash,
        schema_version: 'suar.accomplishment_evidence_link.v1',
        evidence_payload: JSON.stringify(link.evidencePayload),
        created_at: timestamp(accomplishment.createdAt, 'created timestamp'),
      }))
    )
  }
  if (input.reviewObservationLinks.length > 0) {
    await trx.table(OBSERVATION_LINK_TABLE).multiInsert(
      input.reviewObservationLinks.map((link) => ({
        accomplishment_id: accomplishment.id,
        review_observation_id: link.reviewObservationId,
        observation_revision_id: link.observationRevisionId,
        observation_fact_id: link.observationFactId,
        observation_type: link.observationType,
        source_observation_hash: link.sourceObservationHash,
        disposition: link.disposition,
        governance_state: link.governanceState,
        schema_version: 'suar.accomplishment_review_observation_link.v1',
        link_payload: JSON.stringify(link.linkPayload),
        created_at: timestamp(accomplishment.createdAt, 'created timestamp'),
      }))
    )
  }
  if (input.capabilitySignals.length > 0) {
    await trx.table(SIGNAL_TABLE).multiInsert(
      input.capabilitySignals.map(({ projectionKey, signal, sourceObservationHash }) => ({
        id: signal.id,
        projection_key: projectionKey,
        contract_version: signal.contractVersion,
        schema_version: 'suar.accomplishment_capability_signal.v1',
        policy_version: signal.policyVersion,
        accomplishment_id: accomplishment.id,
        subject_user_id: signal.subjectUserId,
        capability_id: signal.capabilityId,
        observed_behaviour: signal.observedBehaviour,
        observed_level_code: signal.observedLevelCode,
        assessment_ceiling_code: signal.assessmentCeilingCode,
        direction: signal.direction,
        applicability: signal.applicability,
        action: signal.context.action,
        object: signal.context.object,
        ownership_level: signal.context.ownershipLevel,
        complexity_summary: signal.context.complexitySummary,
        confidence_score: signal.confidenceScore,
        confidence_band: signal.confidenceBand,
        signal_state: signal.signalState,
        evidence_reference_ids: JSON.stringify(signal.evidenceReferences),
        review_observation_ids: JSON.stringify(signal.reviewObservationIds),
        source_observation_hash: sourceObservationHash,
        signal_payload: JSON.stringify(signal),
        observed_at: timestamp(signal.observedAt, 'signal observed timestamp'),
        created_at: timestamp(accomplishment.createdAt, 'created timestamp'),
      }))
    )
  }
  await trx.table(LIFECYCLE_TABLE).multiInsert(
    lifecycle.map((revision) => ({
      id: revision.id,
      contract_version: revision.contractVersion,
      schema_version: 'suar.accomplishment_lifecycle_revision.v1',
      accomplishment_id: accomplishment.id,
      sequence: revision.sequence,
      previous_state: revision.previousState,
      next_state: revision.nextState,
      visibility: revision.visibility,
      reason_code: revision.reasonCode,
      source_fact_id: revision.sourceFact.id,
      source_fact_type: revision.sourceFact.type,
      source_fact_hash: revision.sourceFact.hash,
      actor_type: revision.actor.type,
      actor_user_id: revision.actor.userId,
      policy_version: revision.policyVersion,
      supersedes_revision_id: revision.supersedesRevisionId,
      related_accomplishment_id: revision.relatedAccomplishmentId,
      revision_payload: JSON.stringify(revision),
      occurred_at: timestamp(revision.occurredAt, 'lifecycle timestamp'),
      created_at: timestamp(revision.occurredAt, 'lifecycle timestamp'),
    }))
  )
  return { row, lifecycleHead: await loadLifecycleHead(trx, accomplishment.id) }
}

export class VerifiedAccomplishmentRepository implements VerifiedAccomplishmentWriter {
  constructor(
    private readonly hasher: AccomplishmentContentHasher = new NodeAccomplishmentContentHasher()
  ) {}

  async createOrLoad(
    input: CreateVerifiedAccomplishmentAggregateInput,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedVerifiedAccomplishmentResult> {
    const { accomplishment, lifecycle } = assertAggregateInput(input, this.hasher)
    const persist = async (trx: TransactionClientContract) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `verified-accomplishment:${input.projectionKey}`,
      ])
      const existing = (await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('projection_key', input.projectionKey)
        .forUpdate()
        .first()) as AccomplishmentRow | undefined
      if (existing) {
        const head = await assertExistingAggregate(trx, existing, input, this.hasher)
        return resultFromRows(existing, head, false)
      }

      const inserted = await insertAggregate(trx, input, accomplishment, lifecycle)
      return resultFromRows(inserted.row, inserted.lifecycleHead, true)
    }
    return transaction
      ? persist(transaction as TransactionClientContract)
      : db.transaction(persist)
  }
}

export const verifiedAccomplishmentRepository = new VerifiedAccomplishmentRepository()
