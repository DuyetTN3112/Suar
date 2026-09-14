import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  assertExistingAggregate,
  loadLifecycleHead,
  resultFromRows,
} from './verified_accomplishment_aggregate_integrity.js'
import { assertAggregateInput } from './verified_accomplishment_aggregate_validator.js'
import {
  ACCOMPLISHMENT_TABLE,
  CLAIM_LINK_TABLE,
  EVIDENCE_LINK_TABLE,
  LIFECYCLE_TABLE,
  LOCK_TIMEOUT,
  OBSERVATION_LINK_TABLE,
  SIGNAL_TABLE,
  VerifiedAccomplishmentProjectionCollisionException,
  timestamp,
  type AccomplishmentRow,
  type LifecycleRow,
} from './verified_accomplishment_types.js'

import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  CreateVerifiedAccomplishmentAggregateInput,
  PersistedVerifiedAccomplishmentResult,
  VerifiedAccomplishmentWriter,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export { VerifiedAccomplishmentProjectionCollisionException }

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
