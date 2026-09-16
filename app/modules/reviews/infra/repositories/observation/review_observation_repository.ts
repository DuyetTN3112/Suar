import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { writeCreatedObservationAudit } from './review_observation_audit.js'
import {
  asNonEmpty,
  asValidTimestamp,
  assertRevisionInput,
  assertStableIdentity,
  ReviewObservationIdempotencyCollisionException,
  revisionHash,
} from './review_observation_validation.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  AppendReviewObservationRevisionInput,
  CreateReviewObservationInput,
  PersistedReviewObservationResult,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationRevisionMetadata,
  ReviewObservationWriter,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'


export type {
  AppendReviewObservationRevisionInput,
  CreateReviewObservationInput,
  PersistedReviewObservationResult,
  ReviewObservationEvidenceLinkInput,
  ReviewObservationRevisionMetadata,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'

export { ReviewObservationIdempotencyCollisionException } from './review_observation_validation.js'

const OBSERVATION_TABLE = 'review_observations'
const REVISION_TABLE = 'review_observation_revisions'
const EVIDENCE_TABLE = 'review_observation_evidence_links'
const LOCK_TIMEOUT = '5000ms'

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
