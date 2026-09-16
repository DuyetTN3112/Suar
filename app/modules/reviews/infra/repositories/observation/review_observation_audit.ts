import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { CreateReviewObservationInput } from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ObservationAuditRevisionTarget {
  revision_number: number | string
  id: string
  observation_fact_id: string
  revision_hash: TvaSha256
}

export async function writeCreatedObservationAudit(
  trx: TransactionClientContract,
  input: CreateReviewObservationInput,
  observationId: string,
  revision: ObservationAuditRevisionTarget
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
      ...(auditContext.userId ? { user_id: auditContext.userId } : {}),
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
