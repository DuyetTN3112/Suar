import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  AppendReviewObservationRevisionInput,
  CreateReviewObservationInput,
  PersistedReviewObservationResult,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationRevisionMetadata,
  ReviewObservationWriter,
  ReviewRationaleClassification,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isReviewObservationV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

export type {
  AppendReviewObservationRevisionInput,
  CreateReviewObservationInput,
  PersistedReviewObservationResult,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationRevisionMetadata,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'

const OBSERVATION_TABLE = 'review_observations'
const REVISION_TABLE = 'review_observation_revisions'
const EVIDENCE_TABLE = 'review_observation_evidence_links'
const LOCK_TIMEOUT = '5000ms'
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/

type EvidenceRelation = 'supports' | 'contradicts' | 'context'
type ReviewerAccessState = 'available' | 'restricted' | 'unavailable' | 'unknown'

interface ObservationRow {
  id: string
  idempotency_key: string
  schema_version: string
  review_workflow_id: string
  review_session_id: string
  task_assignment_id: string
  completion_report_id: string
  completion_claim_id: string | null
  subject_user_id: string
  observation_type: ReviewObservationV1['observationType']
  target_ref: string
  current_revision_number: number | string
  governance_state: ReviewObservationV1['governanceState']
}

interface RevisionRow {
  id: string
  observation_id: string
  observation_fact_id: string
  revision_number: number | string
  review_revision: number | string
  revision_hash: TvaSha256
  governance_state: ReviewObservationV1['governanceState']
}

export class ReviewObservationIdempotencyCollisionException extends InvariantViolationException {
  constructor(idempotencyKey: string) {
    super(`Review observation idempotency key collision: ${idempotencyKey}`)
  }
}

function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function asSha256(value: string, field: string): asserts value is TvaSha256 {
  if (!SHA256_PATTERN.test(value)) {
    throw new InvariantViolationException(`Review observation ${field} must be a SHA-256 hash`)
  }
}

function asNonEmpty(value: string, field: string, maxLength: number): void {
  if (value.trim().length === 0 || value.length > maxLength) {
    throw new InvariantViolationException(`Review observation ${field} is invalid`)
  }
}

function asValidTimestamp(value: string | null, field: string): Date | null {
  if (value === null) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvariantViolationException(`Review observation ${field} is invalid`)
  }
  return parsed
}

function sortedEvidenceLinks(
  links: readonly ReviewObservationEvidenceLinkInput[]
): readonly ReviewObservationEvidenceLinkInput[] {
  return [...links].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId))
}

function assertEvidenceLinks(
  observation: ReviewObservationV1,
  links: readonly ReviewObservationEvidenceLinkInput[]
): void {
  const allowedRelations = new Set<EvidenceRelation>(['supports', 'contradicts', 'context'])
  const allowedClassifications = new Set<TvaPrivacyClassification>([
    'private',
    'internal',
    'confidential',
    'redacted',
    'public_safe',
    'public',
  ])
  const allowedAccessStates = new Set<ReviewerAccessState>([
    'available',
    'restricted',
    'unavailable',
    'unknown',
  ])
  const linkedIds = links.map((link) => link.evidenceId)

  if (new Set(linkedIds).size !== linkedIds.length) {
    throw new InvariantViolationException('Review observation evidence links must be unique')
  }
  if (
    canonicalJson([...linkedIds].sort()) !== canonicalJson([...observation.evidenceRefs].sort())
  ) {
    throw new InvariantViolationException(
      'Review observation evidence links must exactly match the contract evidence references'
    )
  }

  for (const link of links) {
    if (
      !allowedRelations.has(link.relation) ||
      !allowedClassifications.has(link.accessClassification) ||
      !allowedAccessStates.has(link.reviewerAccessState)
    ) {
      throw new InvariantViolationException('Review observation evidence link metadata is invalid')
    }
    if (link.evidenceHash !== null) asSha256(link.evidenceHash, 'evidence hash')
  }
}

function assertRevisionInput(
  input: ReviewObservationRevisionMetadata & {
    observation: ReviewObservationV1
    evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
  }
): void {
  if (!isReviewObservationV1(input.observation)) {
    throw new InvariantViolationException('Review observation contract is invalid')
  }
  asNonEmpty(input.reviewerRole, 'reviewer role', 128)
  asSha256(input.taskAssignmentHash, 'task assignment hash')
  asSha256(input.assignmentSnapshotHash, 'assignment snapshot hash')
  asSha256(input.completionReportHash, 'completion report hash')
  asSha256(input.taskContractHash, 'task contract hash')

  if ((input.completionClaimId === null) !== (input.completionClaimHash === null)) {
    throw new InvariantViolationException(
      'Review observation completion claim ID and hash must be supplied together'
    )
  }
  if (input.completionClaimHash !== null) {
    asSha256(input.completionClaimHash, 'completion claim hash')
  }

  const allowedRationaleClassifications = new Set<ReviewRationaleClassification>([
    'private',
    'internal',
    'confidential',
  ])
  if (!allowedRationaleClassifications.has(input.rationaleClassification)) {
    throw new InvariantViolationException(
      'Review observation rationale cannot be classified for public disclosure'
    )
  }

  const finalizedAt = asValidTimestamp(input.observation.finalizedAt, 'finalized timestamp')
  if (
    (input.observation.governanceState === 'draft' && finalizedAt !== null) ||
    (input.observation.governanceState !== 'draft' && finalizedAt === null)
  ) {
    throw new InvariantViolationException(
      'Review observation finalization must match its governance state'
    )
  }

  const revokedAt = asValidTimestamp(input.revokedAt, 'revocation timestamp')
  const hasCompleteRevocation =
    revokedAt !== null &&
    input.revokedBy !== null &&
    input.revocationReason !== null &&
    input.revocationReason.trim().length > 0
  if (
    (input.observation.governanceState === 'revoked' && !hasCompleteRevocation) ||
    (input.observation.governanceState !== 'revoked' &&
      (input.revokedAt !== null || input.revokedBy !== null || input.revocationReason !== null))
  ) {
    throw new InvariantViolationException(
      'Review observation revocation metadata must match its governance state'
    )
  }

  const disputeFrozenAt = asValidTimestamp(input.disputeFrozenAt, 'dispute freeze timestamp')
  if (
    (input.disputeId === null) !== (disputeFrozenAt === null) ||
    (input.disputeId !== null &&
      !['disputed', 'frozen'].includes(input.observation.governanceState))
  ) {
    throw new InvariantViolationException('Review observation dispute freeze metadata is invalid')
  }

  assertEvidenceLinks(input.observation, input.evidenceLinks)
}

function revisionHash(
  input: ReviewObservationRevisionMetadata & {
    observation: ReviewObservationV1
    evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
  }
): TvaSha256 {
  const value = canonicalJson({
    observation: input.observation,
    reviewerRole: input.reviewerRole,
    taskAssignmentHash: input.taskAssignmentHash,
    assignmentSnapshotHash: input.assignmentSnapshotHash,
    completionReportId: input.completionReportId,
    completionReportHash: input.completionReportHash,
    completionClaimId: input.completionClaimId,
    completionClaimHash: input.completionClaimHash,
    sourceSnapshotId: input.sourceSnapshotId,
    taskContractVersionId: input.taskContractVersionId,
    taskContractHash: input.taskContractHash,
    rationaleClassification: input.rationaleClassification,
    evidenceSufficiency: input.evidenceSufficiency,
    revokedAt: input.revokedAt,
    revokedBy: input.revokedBy,
    revocationReason: input.revocationReason,
    disputeId: input.disputeId,
    disputeFrozenAt: input.disputeFrozenAt,
    revisionPayload: input.revisionPayload ?? input.observation,
    evidenceLinks: sortedEvidenceLinks(input.evidenceLinks),
  })
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function resultFromRows(
  observation: ObservationRow,
  revision: RevisionRow,
  inserted: boolean
): PersistedReviewObservationResult {
  const revisionNumber = Number(revision.revision_number)
  if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
    throw new InvariantViolationException('Stored review observation revision number is invalid')
  }
  return {
    inserted,
    observationId: observation.id,
    observationFactId: revision.observation_fact_id,
    revisionId: revision.id,
    revisionNumber,
    revisionHash: revision.revision_hash,
    governanceState: revision.governance_state,
  }
}

async function writeCreatedObservationAudit(
  trx: TransactionClientContract,
  input: CreateReviewObservationInput,
  observationId: string,
  revision: RevisionRow
): Promise<void> {
  const auditContext = input.auditContext ?? {
    userId: input.observation.reviewerId,
    ip: '0.0.0.0',
    userAgent: 'review-observation-repository',
    organizationId: null,
    requestId: null,
    traceId: null,
    workflowId: input.observation.reviewWorkflowId,
  }

  await auditPublicApi.write(
    auditContext,
    {
      action: 'review_observation.created',
      entity_type: 'review_observation',
      entity_id: observationId,
      user_id: auditContext.userId ?? undefined,
      event_name: 'review_observation.created',
      event_family: 'review_observation',
      module: 'reviews',
      subsystem: 'observation',
      workflow: 'native_review_observation',
      stage: 'create',
      outcome: 'persisted',
      actor_type: 'reviewer',
      target_type: 'review_observation',
      target_id: observationId,
      correlation_key: input.idempotencyKey,
      retention_class: 'review_audit',
      source_occurred_at: new Date(input.observation.createdAt),
      redaction_applied: true,
      critical: true,
      old_values: null,
      new_values: {
        reviewWorkflowId: input.observation.reviewWorkflowId,
        reviewSessionId: input.observation.reviewSessionId,
        taskAssignmentId: input.observation.taskAssignmentId,
        assignmentSnapshotId: input.observation.assignmentSnapshotId,
        sourceSnapshotId: input.sourceSnapshotId,
        completionReportId: input.completionReportId,
        completionClaimId: input.completionClaimId,
        reviewerId: input.observation.reviewerId,
        reviewerType: input.observation.reviewerType,
        reviewerRole: input.reviewerRole,
        observationType: input.observation.observationType,
        targetRef: input.observation.targetRef,
        disposition: input.observation.disposition,
        reviewRevision: input.observation.reviewRevision,
        revisionNumber: Number(revision.revision_number),
        revisionId: revision.id,
        observationFactId: revision.observation_fact_id,
        revisionHash: revision.revision_hash,
        taskAssignmentHash: input.taskAssignmentHash,
        assignmentSnapshotHash: input.assignmentSnapshotHash,
        completionReportHash: input.completionReportHash,
        completionClaimHash: input.completionClaimHash,
        taskContractVersionId: input.taskContractVersionId,
        taskContractHash: input.taskContractHash,
        evidenceIds: input.evidenceLinks.map((link) => link.evidenceId).sort(),
        evidenceHashes: input.evidenceLinks
          .map((link) => link.evidenceHash)
          .filter((hash): hash is TvaSha256 => hash !== null)
          .sort(),
        evidenceSufficiency: input.evidenceSufficiency,
        rationaleClassification: input.rationaleClassification,
        governanceState: input.observation.governanceState,
      },
    },
    trx
  )
}

async function currentRevision(
  trx: TransactionClientContract,
  observation: ObservationRow
): Promise<RevisionRow> {
  const row = (await trx
    .from(REVISION_TABLE)
    .where('observation_id', observation.id)
    .where('revision_number', Number(observation.current_revision_number))
    .first()) as RevisionRow | undefined
  if (!row) {
    throw new InvariantViolationException(
      'Review observation current revision pointer does not resolve to a durable revision'
    )
  }
  return row
}

async function revisionByFactId(
  trx: TransactionClientContract,
  observationId: string,
  observationFactId: string
): Promise<RevisionRow | undefined> {
  return (await trx
    .from(REVISION_TABLE)
    .where('observation_id', observationId)
    .where('observation_fact_id', observationFactId)
    .first()) as RevisionRow | undefined
}

function assertStableIdentity(
  observation: ObservationRow,
  next: CreateReviewObservationInput
): void {
  const fact = next.observation
  if (
    observation.schema_version !== fact.schemaVersion ||
    observation.review_workflow_id !== fact.reviewWorkflowId ||
    observation.review_session_id !== fact.reviewSessionId ||
    observation.task_assignment_id !== fact.taskAssignmentId ||
    observation.completion_report_id !== next.completionReportId ||
    observation.completion_claim_id !== next.completionClaimId ||
    observation.subject_user_id !== fact.subjectUserId ||
    observation.observation_type !== fact.observationType ||
    observation.target_ref !== fact.targetRef
  ) {
    throw new InvariantViolationException(
      'Review observation correction cannot change the stable observation identity'
    )
  }
}

async function insertRevision(
  trx: TransactionClientContract,
  observationId: string,
  revisionNumber: number,
  input: ReviewObservationRevisionMetadata & {
    observation: ReviewObservationV1
    evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
  },
  hash: TvaSha256,
  superseded: RevisionRow | null
): Promise<RevisionRow> {
  const fact = input.observation
  const rows = (await trx
    .table(REVISION_TABLE)
    .insert({
      observation_id: observationId,
      observation_fact_id: fact.id,
      revision_number: revisionNumber,
      review_revision: fact.reviewRevision,
      schema_version: fact.schemaVersion,
      revision_hash: hash,
      review_policy_version: fact.reviewPolicyVersion,
      capability_taxonomy_version: fact.capabilityTaxonomyVersion,
      review_workflow_id: fact.reviewWorkflowId,
      review_session_id: fact.reviewSessionId,
      reviewer_id: fact.reviewerId,
      reviewer_type: fact.reviewerType,
      reviewer_role: input.reviewerRole.trim(),
      task_assignment_id: fact.taskAssignmentId,
      task_assignment_hash: input.taskAssignmentHash,
      assignment_snapshot_id: fact.assignmentSnapshotId,
      assignment_snapshot_hash: input.assignmentSnapshotHash,
      completion_report_id: input.completionReportId,
      completion_report_hash: input.completionReportHash,
      completion_claim_id: input.completionClaimId,
      completion_claim_hash: input.completionClaimHash,
      source_snapshot_id: input.sourceSnapshotId,
      source_snapshot_hash: fact.sourceSnapshotHash,
      task_contract_version_id: input.taskContractVersionId,
      task_contract_hash: input.taskContractHash,
      subject_user_id: fact.subjectUserId,
      observation_type: fact.observationType,
      target_ref: fact.targetRef,
      disposition: fact.disposition,
      structured_value: JSON.stringify(fact.structuredValue),
      rationale: fact.rationale,
      rationale_classification: input.rationaleClassification,
      confidence: fact.confidence,
      assessment_ceiling: fact.assessmentCeiling,
      evidence_sufficiency: input.evidenceSufficiency,
      governance_state: fact.governanceState,
      finalized_at: fact.finalizedAt === null ? null : new Date(fact.finalizedAt),
      supersedes_revision_id: superseded?.id ?? null,
      supersedes_observation_id: superseded?.observation_fact_id ?? null,
      revoked_at: asValidTimestamp(input.revokedAt, 'revocation timestamp'),
      revoked_by: input.revokedBy,
      revocation_reason: input.revocationReason,
      dispute_id: input.disputeId,
      dispute_frozen_at: asValidTimestamp(input.disputeFrozenAt, 'dispute freeze timestamp'),
      revision_payload: JSON.stringify(input.revisionPayload ?? fact),
      created_at: new Date(fact.createdAt),
    })
    .returning('*')) as RevisionRow[]
  const revision = rows[0]
  if (!revision) {
    throw new InvariantViolationException('Review observation revision insert returned no row')
  }

  if (input.evidenceLinks.length > 0) {
    await trx.table(EVIDENCE_TABLE).multiInsert(
      input.evidenceLinks.map((link) => ({
        observation_revision_id: revision.id,
        evidence_id: link.evidenceId,
        relation: link.relation,
        access_classification: link.accessClassification,
        reviewer_access_state: link.reviewerAccessState,
        evidence_hash: link.evidenceHash,
        created_at: new Date(fact.createdAt),
      }))
    )
  }
  return revision
}

export class ReviewObservationRepository implements ReviewObservationWriter {
  async createOrLoad(
    input: CreateReviewObservationInput
  ): Promise<PersistedReviewObservationResult> {
    assertRevisionInput(input)
    asNonEmpty(input.idempotencyKey, 'idempotency key', 255)
    if (input.observation.supersedesObservationId !== null) {
      throw new InvariantViolationException(
        'A new review observation cannot supersede an earlier observation fact'
      )
    }
    const hash = revisionHash(input)

    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      const insertedRows = (await trx
        .table(OBSERVATION_TABLE)
        .insert({
          idempotency_key: input.idempotencyKey,
          schema_version: input.observation.schemaVersion,
          review_workflow_id: input.observation.reviewWorkflowId,
          review_session_id: input.observation.reviewSessionId,
          task_assignment_id: input.observation.taskAssignmentId,
          completion_report_id: input.completionReportId,
          completion_claim_id: input.completionClaimId,
          subject_user_id: input.observation.subjectUserId,
          observation_type: input.observation.observationType,
          target_ref: input.observation.targetRef,
          current_revision_number: 1,
          governance_state: input.observation.governanceState,
          created_at: new Date(input.observation.createdAt),
        })
        .onConflict('idempotency_key')
        .ignore()
        .returning('*')) as ObservationRow[]

      const inserted = insertedRows[0]
      if (inserted) {
        const revision = await insertRevision(trx, inserted.id, 1, input, hash, null)
        await writeCreatedObservationAudit(trx, input, inserted.id, revision)
        return resultFromRows(inserted, revision, true)
      }

      const existing = (await trx
        .from(OBSERVATION_TABLE)
        .where('idempotency_key', input.idempotencyKey)
        .forUpdate()
        .first()) as ObservationRow | undefined
      if (!existing) {
        throw new InvariantViolationException(
          'Review observation conflict did not resolve to a durable row'
        )
      }
      const revision = (await trx
        .from(REVISION_TABLE)
        .where('observation_id', existing.id)
        .where('revision_number', 1)
        .first()) as RevisionRow | undefined
      if (!revision) {
        throw new InvariantViolationException(
          'Review observation idempotency key does not resolve to its initial revision'
        )
      }
      if (revision.revision_hash !== hash) {
        throw new ReviewObservationIdempotencyCollisionException(input.idempotencyKey)
      }
      return resultFromRows(existing, revision, false)
    })
  }

  async appendRevision(
    input: AppendReviewObservationRevisionInput
  ): Promise<PersistedReviewObservationResult> {
    assertRevisionInput(input)
    if (!Number.isSafeInteger(input.expectedRevisionNumber) || input.expectedRevisionNumber < 1) {
      throw new InvariantViolationException(
        'Review observation expected revision number is invalid'
      )
    }
    const hash = revisionHash(input)

    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      const observation = (await trx
        .from(OBSERVATION_TABLE)
        .where('id', input.observationId)
        .forUpdate()
        .first()) as ObservationRow | undefined
      if (!observation) {
        throw new InvariantViolationException('Cannot revise a missing review observation')
      }
      assertStableIdentity(observation, { ...input, idempotencyKey: observation.idempotency_key })
      const existingFact = await revisionByFactId(trx, observation.id, input.observation.id)
      if (existingFact) {
        if (existingFact.revision_hash !== hash) {
          throw new ReviewObservationIdempotencyCollisionException(input.observation.id)
        }
        return resultFromRows(observation, existingFact, false)
      }

      const previous = await currentRevision(trx, observation)

      const currentNumber = Number(observation.current_revision_number)
      if (currentNumber !== input.expectedRevisionNumber) {
        throw new InvariantViolationException(
          `Review observation revision conflict: expected ${input.expectedRevisionNumber}, current ${currentNumber}`
        )
      }
      if (
        input.observation.supersedesObservationId !== previous.observation_fact_id ||
        input.observation.reviewRevision <= Number(previous.review_revision)
      ) {
        throw new InvariantViolationException(
          'Review observation correction must supersede the current fact with a newer review revision'
        )
      }

      const nextNumber = currentNumber + 1
      const revision = await insertRevision(trx, observation.id, nextNumber, input, hash, previous)
      const updatedRows = (await trx
        .from(OBSERVATION_TABLE)
        .where('id', observation.id)
        .where('current_revision_number', currentNumber)
        .update({
          current_revision_number: nextNumber,
          governance_state: input.observation.governanceState,
        })
        .returning('*')) as ObservationRow[]
      const updated = updatedRows[0]
      if (!updated) {
        throw new InvariantViolationException(
          'Review observation revision compare-and-set lost its row lock'
        )
      }
      return resultFromRows(updated, revision, true)
    })
  }
}

export const reviewObservationRepository = new ReviewObservationRepository()
