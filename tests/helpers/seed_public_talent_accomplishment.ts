import db from '@adonisjs/lucid/services/db'

import { testId } from './test_utils.js'

import { hashVerifiedAccomplishmentPayload } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { validVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

const hasher = new NodeAccomplishmentContentHasher()

/**
 * Seeds a valid canonical source. Raw inserts here are test facts only; the
 * end-user publication E2E calls the real HTTP application command afterwards.
 */
export async function seedPublicTalentAccomplishment(input: {
  readonly userId: string
  readonly organizationId: string | null
  readonly seedKey: string
  readonly visibility?: 'private' | 'internal' | 'public'
}) {
  const base = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())
  const baseEvidence = base.evidenceReferences[0]
  if (!baseEvidence) throw new Error('Seed fixture must contain an evidence reference')
  const visibility = input.visibility ?? 'public'
  const accomplishmentId = testId()
  const taskId = testId()
  const assignmentId = testId()
  const lifecycleRevisionId = testId()
  const sourceFactId = testId()
  const taskSpecificationVersionId = testId()
  const taskContractVersionId = testId()
  const assignmentSnapshotId = testId()
  const completionReportId = testId()
  const completionClaimId = testId()
  const reviewWorkflowId = testId()
  const reviewObservationId = testId()
  const reviewerId = testId()
  const evidenceId = testId()
  const hashes = {
    specification: `sha256:${'1'.repeat(64)}` as const,
    contract: `sha256:${'2'.repeat(64)}` as const,
    assignment: `sha256:${'3'.repeat(64)}` as const,
    completion: `sha256:${'4'.repeat(64)}` as const,
    review: `sha256:${'5'.repeat(64)}` as const,
    source: `sha256:${'7'.repeat(64)}` as const,
  }
  const privateSourceMarker = `private-source-${input.seedKey}`
  const withoutHash: VerifiedWorkAccomplishmentV1 = {
    ...base,
    id: accomplishmentId,
    userId: input.userId,
    organizationId: input.organizationId,
    projectId: null,
    taskId,
    taskAssignmentId: assignmentId,
    visibility,
    detailedStatement: `${base.detailedStatement ?? ''} ${privateSourceMarker}`,
    verification: {
      ...base.verification,
      reviewerReferences: [{ reviewerId, reviewerRole: 'backend_lead' }],
    },
    evidenceReferences: [
      {
        ...baseEvidence,
        evidenceId,
        contentHash: hashes.source,
      },
    ],
    capabilitySignalIds: [testId()],
    provenance: {
      ...base.provenance,
      taskSpecificationVersionId,
      taskContractVersionId,
      assignmentSnapshotId,
      completionReportId,
      completionClaimIds: [completionClaimId],
      reviewWorkflowId,
      reviewObservationIds: [reviewObservationId],
      sourceHashes: {
        taskSpecification: hashes.specification,
        taskContract: hashes.contract,
        assignmentSnapshot: hashes.assignment,
        completionReport: hashes.completion,
        review: hashes.review,
      },
    },
    updatedAt: new Date().toISOString(),
  }
  const accomplishment: VerifiedWorkAccomplishmentV1 = {
    ...withoutHash,
    canonicalHash: hashVerifiedAccomplishmentPayload(withoutHash, hasher),
  }

  await db.table('verified_work_accomplishments').insert({
    id: accomplishment.id,
    projection_key: `vwa:e2e:${input.seedKey}`,
    contract_version: 1,
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
    task_specification_version_id: taskSpecificationVersionId,
    task_contract_version_id: taskContractVersionId,
    assignment_snapshot_id: assignmentSnapshotId,
    completion_report_id: completionReportId,
    review_workflow_id: reviewWorkflowId,
    task_specification_hash: hashes.specification,
    task_contract_hash: hashes.contract,
    assignment_snapshot_hash: hashes.assignment,
    completion_report_hash: hashes.completion,
    review_hash: hashes.review,
    canonical_hash: accomplishment.canonicalHash,
    canonical_payload: JSON.stringify(accomplishment),
    verified_at: accomplishment.verification.verifiedAt,
    created_at: accomplishment.createdAt,
    updated_at: accomplishment.updatedAt,
  })

  await db.table('accomplishment_lifecycle_revisions').insert({
    id: lifecycleRevisionId,
    contract_version: 1,
    schema_version: 'suar.accomplishment_lifecycle_revision.v1',
    accomplishment_id: accomplishment.id,
    sequence: 1,
    previous_state: 'under_review',
    next_state: 'verified',
    visibility,
    reason_code: 'verification_completed',
    source_fact_id: sourceFactId,
    source_fact_type: 'review_finalized',
    source_fact_hash: hashes.source,
    actor_type: 'user',
    actor_user_id: reviewerId,
    policy_version: accomplishment.provenance.policyVersion,
    supersedes_revision_id: null,
    related_accomplishment_id: null,
    revision_payload: {
      contractVersion: 1,
      id: lifecycleRevisionId,
      accomplishmentId: accomplishment.id,
      sequence: 1,
      previousState: 'under_review',
      nextState: 'verified',
      visibility,
      reasonCode: 'verification_completed',
      sourceFact: {
        id: sourceFactId,
        type: 'review_finalized',
        hash: hashes.source,
      },
      actor: { type: 'user', userId: reviewerId },
      policyVersion: accomplishment.provenance.policyVersion,
      supersedesRevisionId: null,
      relatedAccomplishmentId: null,
      occurredAt: accomplishment.verification.verifiedAt,
    },
    occurred_at: accomplishment.verification.verifiedAt,
  })

  return {
    accomplishmentId: accomplishment.id,
    canonicalHash: accomplishment.canonicalHash,
    lifecycleRevisionId,
    title: accomplishment.title,
    taskId,
    privateSourceMarker,
  }
}
