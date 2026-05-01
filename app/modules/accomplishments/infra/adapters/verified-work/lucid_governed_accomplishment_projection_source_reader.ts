/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import db from '@adonisjs/lucid/services/db'

import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  GovernedAccomplishmentProjectionSource,
  GovernedAccomplishmentProjectionSourceIdentity,
  GovernedAccomplishmentProjectionSourceReader,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import { projectAccomplishmentTaxonomy } from '#modules/accomplishments/domain/verified-work/accomplishment_taxonomy_projection'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import {
  isCompletionClaimV1,
  isReviewObservationV1,
  isTaskAssignmentSnapshotV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

const hasher = new NodeAccomplishmentContentHasher()
const hash = (value: unknown): TvaSha256 => hasher.hash(value)
const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
const iso = (value: unknown): string => new Date(value as string | Date).toISOString()

function clientFor(transaction?: AccomplishmentTransaction) {
  return (transaction ?? db) as typeof db
}

function observationFromRevision(row: Record<string, unknown>): ReviewObservationV1 | null {
  const persistedPayload = asObject(row['revision_payload'])
  if (persistedPayload && isReviewObservationV1(persistedPayload)) {
    return persistedPayload
  }
  const observation: ReviewObservationV1 = {
    schemaVersion: String(row['schema_version']) as 'suar.review_observation.v1',
    id: String(row['observation_fact_id']),
    reviewWorkflowId: String(row['review_workflow_id']),
    reviewSessionId: String(row['review_session_id']),
    reviewRevision: Number(row['review_revision']),
    reviewPolicyVersion: String(row['review_policy_version']),
    capabilityTaxonomyVersion: (row['capability_taxonomy_version'] as string | null) ?? null,
    assignmentSnapshotId: String(row['assignment_snapshot_id']),
    sourceSnapshotHash: String(row['source_snapshot_hash']) as TvaSha256,
    taskAssignmentId: String(row['task_assignment_id']),
    subjectUserId: String(row['subject_user_id']),
    observationType: String(row['observation_type']) as ReviewObservationV1['observationType'],
    targetRef: String(row['target_ref']),
    disposition: String(row['disposition']) as ReviewObservationV1['disposition'],
    structuredValue: (asObject(row['structured_value']) ??
      {}) as ReviewObservationV1['structuredValue'],
    rationale: String(row['rationale']),
    evidenceRefs: Array.isArray(row['evidence_refs']) ? (row['evidence_refs'] as string[]) : [],
    reviewerId: String(row['reviewer_id']),
    reviewerType: String(row['reviewer_type']),
    confidence: row['confidence'] === null ? null : Number(row['confidence']),
    assessmentCeiling:
      row['assessment_ceiling'] === null ? null : Number(row['assessment_ceiling']),
    governanceState: String(row['governance_state']) as ReviewObservationV1['governanceState'],
    supersedesObservationId: (row['supersedes_observation_id'] as string | null) ?? null,
    createdAt: iso(row['created_at']),
    finalizedAt: row['finalized_at'] === null ? null : iso(row['finalized_at']),
  }
  return isReviewObservationV1(observation) ? observation : null
}

function claimFromRow(row: Record<string, unknown>): CompletionClaimV1 | null {
  const claim: CompletionClaimV1 = {
    schemaVersion: String(row['schema_version']) as 'suar.completion_claim.v1',
    id: String(row['id']),
    completionReportId: String(row['completion_report_id']),
    completionReportRevision: Number(row['completion_report_revision']),
    completionReportHash: String(row['completion_report_hash']) as TvaSha256,
    assignmentSnapshotId: String(row['assignment_snapshot_id']),
    taskContractVersionId: String(row['task_contract_version_id']),
    userId: String(row['contributor_user_id']),
    action: String(row['action']),
    object: String(row['object']),
    proposedTitle: String(row['proposed_title']),
    proposedStatement: String(row['proposed_statement']),
    actualRole: String(row['actual_role']),
    actualOwnership: String(row['actual_ownership']) as CompletionClaimV1['actualOwnership'],
    actualAutonomy: (row['actual_autonomy'] as CompletionClaimV1['actualAutonomy']) ?? null,
    contributionStatement: String(row['contribution_statement']),
    deliverableRefs: Array.isArray(row['deliverable_refs'])
      ? (row['deliverable_refs'] as string[])
      : [],
    criterionResultRefs: Array.isArray(row['criterion_result_refs'])
      ? (row['criterion_result_refs'] as string[])
      : [],
    evidenceRefs: Array.isArray(row['evidence_refs']) ? (row['evidence_refs'] as string[]) : [],
    outcomeData: (asObject(row['outcome_data']) ?? {}) as CompletionClaimV1['outcomeData'],
    publicClaimDraft: (row['public_claim_draft'] as string | null) ?? null,
    privacyClassification: String(
      row['privacy_classification']
    ) as CompletionClaimV1['privacyClassification'],
    status: String(row['claim_status']) as CompletionClaimV1['status'],
    createdAt: iso(row['created_at']),
  }
  return isCompletionClaimV1(claim) ? claim : null
}

export default class LucidGovernedAccomplishmentProjectionSourceReader implements GovernedAccomplishmentProjectionSourceReader {
  async load(
    identity: GovernedAccomplishmentProjectionSourceIdentity,
    transaction?: AccomplishmentTransaction
  ): Promise<GovernedAccomplishmentProjectionSource | null> {
    const client = clientFor(transaction)
    const workflow = await client
      .from('task_review_workflows')
      .where({ id: identity.reviewWorkflowId })
      .first()
    // A review observation can exist while a task review is still being
    // discussed, resolved by an administrator, or otherwise not final. It is
    // not allowed to create profile evidence until the Task Review Board has
    // reached its explicit terminal state.
    if (!workflow?.task_assignment_id || workflow.status !== 'done') return null

    const observations = await client
      .from('review_observation_revisions as revision')
      .join('review_observations as observation', 'observation.id', 'revision.observation_id')
      .select('revision.*')
      .where({
        'observation.review_workflow_id': identity.reviewWorkflowId,
        'observation.governance_state': 'final',
        'revision.governance_state': 'final',
        'revision.observation_type': 'accomplishment_claim',
        'revision.target_ref': identity.completionClaimId,
      })
      .whereColumn('revision.revision_number', 'observation.current_revision_number')
      .orderBy('revision_number', 'desc')
    const latestByObservation = new Map<string, Record<string, unknown>>()
    for (const row of observations as Record<string, unknown>[]) {
      const key = String(row['observation_id'])
      if (!latestByObservation.has(key)) latestByObservation.set(key, row)
    }
    const finalRows = [...latestByObservation.values()]
    const finalizedFact = finalRows.find(
      (row) =>
        String(row['observation_fact_id']) === identity.reviewFinalizedFactId &&
        String(row['revision_hash']) === identity.reviewFinalizedFactHash
    )
    if (!finalizedFact) return null
    const observationFacts = finalRows.map(observationFromRevision)
    if (observationFacts.some((observation) => observation === null)) return null
    const observationsV1 = observationFacts as ReviewObservationV1[]
    const firstObservation = observationsV1[0]
    if (!firstObservation) return null

    const snapshotRow = await client
      .from('task_assignment_snapshots')
      .where({
        id: firstObservation.assignmentSnapshotId,
        task_assignment_id: workflow.task_assignment_id,
      })
      .first()
    const envelope = asObject(snapshotRow?.canonical_snapshot)
    const snapshot = asObject(envelope?.['snapshot'])
    if (
      !snapshotRow ||
      !snapshot ||
      !isTaskAssignmentSnapshotV1(snapshot) ||
      snapshot.snapshotHash !== snapshotRow.snapshot_hash
    )
      return null
    const snapshotV1 = snapshot as unknown as TaskAssignmentSnapshotV1
    const resolved = snapshotV1.resolvedContract
    const taxonomy = projectAccomplishmentTaxonomy(snapshotV1, resolved.work.complexityContext)
    const report = await client
      .from('task_completion_reports')
      .where({
        id: finalRows[0]?.['completion_report_id'],
        task_assignment_id: workflow.task_assignment_id,
        assignment_snapshot_id: snapshotV1.id,
        report_status: 'submitted',
      })
      .first()
    if (!report) return null
    const claimRow = await client
      .from('task_completion_contributor_claims')
      .where({
        id: identity.completionClaimId,
        completion_report_id: report.id,
        contributor_user_id: snapshotV1.assigneeId,
        completion_report_hash: report.completion_report_hash,
      })
      .first()
    const claim = claimRow ? claimFromRow(claimRow as Record<string, unknown>) : null
    if (!claim || claim.id !== identity.completionClaimId) return null
    const evidenceRows = await client
      .from('task_completion_evidence_manifest')
      .where({ completion_report_id: report.id })
    const criterionRows = await client
      .from('task_completion_criterion_results')
      .where({ completion_report_id: report.id })
    const mappingRows = await client
      .from('task_completion_evidence_mappings')
      .where({ completion_report_id: report.id })
    const specification = await client
      .from('task_specification_versions')
      .where({ id: resolved.specification.versionId })
      .first()
    if (!specification) return null

    const reviewHash = hash({
      observations: observationsV1
        .map((observation, index) => ({
          observation,
          revisionHash: finalRows[index]?.['revision_hash'],
        }))
        .sort((a, b) => a.observation.id.localeCompare(b.observation.id)),
    })
    const policyVersion = firstObservation.reviewPolicyVersion
    const requiredCount = Math.max(1, Number(workflow.required_review_count ?? 1))
    const reviewerCount = new Set(observationsV1.map((observation) => observation.reviewerId)).size
    const unresolvedDispute = Boolean(
      await client
        .from('review_disputes')
        .where('review_session_id', firstObservation.reviewSessionId)
        .whereIn('status', ['pending', 'admin_reviewing'])
        .first()
    )
    const requirement = {
      taskId: snapshotV1.taskId,
      taskAssignmentId: snapshotV1.assignmentId,
      assignmentSnapshotId: snapshotV1.id,
      assignmentSnapshotHash: snapshotV1.snapshotHash,
      taskSpecificationVersionId: resolved.specification.versionId,
      taskSpecificationHash: specification.content_hash as TvaSha256,
      taskContractVersionId: resolved.versionId,
      taskContractHash: resolved.resolvedContentHash,
      businessContext: null,
      systemArea: null,
      environment: resolved.work.environment,
      scaleSummary: null,
      constraints: resolved.work.constraints.map((item) => ({
        id: item.id,
        description: item.title,
      })),
      deliverables: resolved.work.deliverables.map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.expectedFormat ?? 'deliverable',
        summary: item.expectedLocation,
      })),
    }
    return {
      identity,
      organizationId: snapshotV1.organizationId,
      projectId: snapshotV1.projectId,
      projectContextVersionId: snapshotV1.provenance.projectContextVersionId,
      workPackageVersionId: snapshotV1.provenance.workPackageVersionId,
      provenanceClass: 'native_prework',
      reconstruction: null,
      gateInput: {
        profileEligible: resolved.evidence.profileEligibility,
        requiredReviewerQuorumMet: reviewerCount >= requiredCount,
        requiredReviewerCount: requiredCount,
        expectedReviewPolicyVersion: policyVersion,
        unresolvedDispute,
        taskAssignmentId: snapshotV1.assignmentId,
        assignmentSnapshotId: snapshotV1.id,
        assignmentSnapshotHash: snapshotV1.snapshotHash,
        taskSpecificationVersionId: resolved.specification.versionId,
        taskSpecificationHash: specification.content_hash as TvaSha256,
        taskContractVersionId: resolved.versionId,
        taskContractHash: resolved.resolvedContentHash,
        completionReportId: report.id,
        completionReportHash: report.completion_report_hash,
        reviewWorkflowId: identity.reviewWorkflowId,
        reviewHash,
        claim,
        claimHash: claimRow?.claim_hash as TvaSha256,
        observations: observationsV1.map((observation, index) => ({
          observation,
          revisionHash: finalRows[index]?.['revision_hash'] as TvaSha256,
          evidenceSufficiency: finalRows[index]?.['evidence_sufficiency'] as
            | 'pending'
            | 'adequate'
            | 'governed_exception'
            | 'inadequate',
        })),
      },
      governedClaimRef: {
        claimId: claim.id,
        claimHash: claimRow?.claim_hash as TvaSha256,
        subjectUserId: claim.userId,
      },
      requirementContext: requirement,
      completionReport: {
        id: report.id,
        completionReportHash: report.completion_report_hash,
        taskId: report.task_id,
        taskAssignmentId: report.task_assignment_id,
        assignmentSnapshotId: report.assignment_snapshot_id,
        assignmentSnapshotHash: report.assignment_snapshot_hash,
        taskContractVersionId: report.task_contract_version_id,
        claims: [{ claim, claimHash: claimRow?.claim_hash as TvaSha256 }],
        criterionResults: (criterionRows as Record<string, unknown>[]).map((row) => ({
          id: String(row['id']),
          completionReportId: String(row['completion_report_id']),
          actualOutcome: String(row['actual_outcome']),
          result: String(row['result']) as 'met' | 'partially_met' | 'not_met' | 'not_applicable',
          explanation: String(row['explanation']),
        })),
        evidence: (evidenceRows as Record<string, unknown>[]).map((row) => ({
          id: String(row['id']),
          completionReportId: String(row['completion_report_id']),
          evidenceType: String(row['evidence_type']),
          accessClassification: String(row['access_classification']) as
            | 'private'
            | 'internal'
            | 'confidential'
            | 'redacted'
            | 'public_safe'
            | 'public',
          availability: String(row['availability']) as
            | 'available'
            | 'partially_available'
            | 'unavailable'
            | 'not_disclosed',
          contentHash: row['content_hash'] as TvaSha256 | null,
        })),
        claimEvidenceMappings: (mappingRows as Record<string, unknown>[]).map((row) => ({
          completionReportId: String(row['completion_report_id']),
          contributorClaimId: String(row['contributor_claim_id']),
          evidenceId: String(row['evidence_item_id']),
        })),
      },
      observationFacts: observationsV1.map((observation, index) => ({
        observation,
        observationRevisionId: String(finalRows[index]?.['id']),
        observationFactId: observation.id,
        revisionHash: finalRows[index]?.['revision_hash'] as TvaSha256,
      })),
      reviewHash,
      taskType: taxonomy.taskType,
      businessDomain: taxonomy.businessDomain,
      problemCategory: taxonomy.problemCategory,
      collaborationType: resolved.work.collaborationType,
      complexity: taxonomy.complexity,
      keyDecisions: [],
      technology: taxonomy.technology,
      verification: {
        method: 'human_review',
        confidenceScore: firstObservation.confidence,
        verifiedAt: firstObservation.finalizedAt ?? firstObservation.createdAt,
      },
      initialVisibility: 'private',
      capabilityProjection: null,
    }
  }
}
