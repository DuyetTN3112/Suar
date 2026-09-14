import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  taskAssignmentInteractionDependencies,
  taskExternalDeps,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type { GovernedAccomplishmentProjectionSource } from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import LucidGovernedAccomplishmentProjectionSourceReader from '#modules/accomplishments/infra/adapters/verified-work/lucid_governed_accomplishment_projection_source_reader'
import {
  ReviewObservationRepository,
  type CreateReviewObservationInput,
} from '#modules/reviews/infra/repositories/observation/review_observation_repository'
import type {
  ReviewObservationV1,
  CompletionClaimV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import {
  SubmitTaskCompletionReportCommand,
  type PersistTaskCompletionReportInput,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskCompletionReportRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_report_repository'
import { NodeTaskCompletionReportIdGenerator } from '#modules/tasks/infra/adapters/task-submissions/node_task_completion_report_id_generator'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import {
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import { ProjectMemberFactory } from '#tests/helpers/factories'

const id = () => randomUUID()
const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`

export const IDS = {
  organization: id(),
  project: id(),
  task: id(),
  assignment: id(),
  snapshot: id(),
  specification: id(),
  contract: id(),
  report: id(),
  claim: id(),
  subject: id(),
  workflow: id(),
  session: id(),
  observation: id(),
  observationRevision: id(),
  observationFact: id(),
  reviewer: id(),
  evidence: id(),
  deliverable: id(),
  criterion: id(),
  finalizedFact: id(),
} as const

export function claim(): CompletionClaimV1 {
  return {
    schemaVersion: 'suar.completion_claim.v1',
    id: IDS.claim,
    completionReportId: IDS.report,
    completionReportRevision: 1,
    completionReportHash: hash('4'),
    assignmentSnapshotId: IDS.snapshot,
    taskContractVersionId: IDS.contract,
    userId: IDS.subject,
    action: 'designed',
    object: 'review_confirmed_projector',
    proposedTitle: 'Proved review-confirmed accomplishment projection',
    proposedStatement: 'Proved that a confirmed review projects a durable accomplishment.',
    actualRole: 'backend_engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'independent',
    contributionStatement: 'Owned the projector transaction boundary and persistence proof.',
    deliverableRefs: [IDS.deliverable],
    criterionResultRefs: [IDS.criterion],
    evidenceRefs: [IDS.evidence],
    outcomeData: { transactionRowsPersisted: true },
    publicClaimDraft: null,
    privacyClassification: 'confidential',
    status: 'under_review',
    createdAt: '2026-08-01T08:00:00.000Z',
  }
}

export function observation(): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: IDS.observation,
    reviewWorkflowId: IDS.workflow,
    reviewSessionId: IDS.session,
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: null,
    assignmentSnapshotId: IDS.snapshot,
    sourceSnapshotHash: hash('3'),
    taskAssignmentId: IDS.assignment,
    subjectUserId: IDS.subject,
    observationType: 'accomplishment_claim',
    targetRef: IDS.claim,
    disposition: 'confirm',
    structuredValue: {
      action: 'designed',
      object: 'review_confirmed_projector',
      actualOwnership: 'primary_owner',
      deliverableRefs: [IDS.deliverable],
      criterionResultRefs: [IDS.criterion],
      evidenceRefs: [IDS.evidence],
    },
    rationale: 'The transaction proof records the confirmed accomplishment and its children.',
    evidenceRefs: [IDS.evidence],
    reviewerId: IDS.reviewer,
    reviewerType: 'human',
    confidence: 0.92,
    assessmentCeiling: null,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
  }
}

export function source(): GovernedAccomplishmentProjectionSource {
  const completionClaim = claim()
  const reviewObservation = observation()
  const identity = {
    reviewWorkflowId: IDS.workflow,
    completionClaimId: IDS.claim,
    reviewFinalizedFactId: IDS.finalizedFact,
    reviewFinalizedFactHash: hash('5'),
    projectionPolicyVersion: 'accomplishment-policy-2026.08',
  }

  return {
    identity,
    organizationId: IDS.organization,
    projectId: IDS.project,
    projectContextVersionId: null,
    workPackageVersionId: null,
    provenanceClass: 'native_prework',
    reconstruction: null,
    gateInput: {
      profileEligible: true,
      requiredReviewerQuorumMet: true,
      requiredReviewerCount: 1,
      expectedReviewPolicyVersion: 'review-policy-2026.08',
      unresolvedDispute: false,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskSpecificationVersionId: IDS.specification,
      taskSpecificationHash: hash('1'),
      taskContractVersionId: IDS.contract,
      taskContractHash: hash('2'),
      completionReportId: IDS.report,
      completionReportHash: hash('4'),
      reviewWorkflowId: IDS.workflow,
      reviewHash: hash('5'),
      claim: completionClaim,
      claimHash: hash('6'),
      observations: [
        {
          observation: reviewObservation,
          revisionHash: hash('7'),
          evidenceSufficiency: 'adequate',
        },
      ],
    },
    governedClaimRef: {
      claimId: IDS.claim,
      claimHash: hash('6'),
      subjectUserId: IDS.subject,
    },
    requirementContext: {
      taskId: IDS.task,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskSpecificationVersionId: IDS.specification,
      taskSpecificationHash: hash('1'),
      taskContractVersionId: IDS.contract,
      taskContractHash: hash('2'),
      businessContext: 'Review-confirmed accomplishment projection',
      systemArea: 'accomplishments',
      environment: 'test',
      scaleSummary: 'One aggregate and its immutable children',
      constraints: [{ id: id(), description: 'All rows must share one transaction.' }],
      deliverables: [
        {
          id: IDS.deliverable,
          title: 'Transaction persistence proof',
          kind: 'integration_test',
          summary: 'Rows are visible inside the transaction and absent after rollback.',
        },
      ],
    },
    completionReport: {
      id: IDS.report,
      completionReportHash: hash('4'),
      taskId: IDS.task,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: hash('3'),
      taskContractVersionId: IDS.contract,
      claims: [{ claim: completionClaim, claimHash: hash('6') }],
      criterionResults: [
        {
          id: IDS.criterion,
          completionReportId: IDS.report,
          actualOutcome: 'Aggregate rows were persisted atomically.',
          result: 'met',
          explanation: 'The rollback and commit assertions both passed.',
        },
      ],
      evidence: [
        {
          id: IDS.evidence,
          completionReportId: IDS.report,
          evidenceType: 'integration_test',
          accessClassification: 'confidential',
          availability: 'available',
          contentHash: hash('8'),
        },
      ],
      claimEvidenceMappings: [
        {
          completionReportId: IDS.report,
          contributorClaimId: IDS.claim,
          evidenceId: IDS.evidence,
        },
      ],
    },
    observationFacts: [
      {
        observation: reviewObservation,
        observationRevisionId: IDS.observationRevision,
        observationFactId: IDS.observationFact,
        revisionHash: hash('7'),
      },
    ],
    reviewHash: hash('5'),
    taskType: 'feature_development',
    businessDomain: 'engineering',
    problemCategory: 'transaction_integrity',
    collaborationType: 'cross_functional',
    complexity: {
      summary: 'Atomic projection across aggregate and immutable child rows',
      factors: ['transaction rollback', 'idempotent aggregate writer'],
      novelty: 'new_domain_flow',
      risk: 'high',
    },
    keyDecisions: ['Use the review transaction handle for source reads and the aggregate write.'],
    technology: ['AdonisJS', 'PostgreSQL'],
    verification: {
      method: 'integration_test',
      confidenceScore: 0.92,
      verifiedAt: '2026-08-01T09:05:00.000Z',
    },
    initialVisibility: 'internal',
    capabilityProjection: null,
  }
}

async function submissionFor(
  taskId: string,
  assignmentId: string,
  assigneeId: string
): Promise<string> {
  const [submission] = (await db
    .table('task_submissions')
    .insert({
      task_assignment_id: assignmentId,
      task_id: taskId,
      submitted_by: assigneeId,
      summary: 'Native Completion Report parent submission',
      status: 'draft',
    })
    .returning('id')) as Array<{ id: string }>
  if (!submission) throw new Error('Native task submission fixture was not created')
  return submission.id
}

function first<T>(values: readonly T[]): T {
  const value = values[0]
  if (value === undefined) throw new Error('Native fixture requires at least one contract item')
  return value
}

export async function createNativeProjectionFixture() {
  const scenario = await CreateTaskScenario.build()
  const assignee = await scenario.createOrgMember()
  await ProjectMemberFactory.create({
    project_id: scenario.project.id,
    user_id: assignee.id,
    project_role: 'project_member',
  })
  const reviewer = await scenario.createProjectManager()
  const task = await scenario.create({
    title: 'Native review-confirmed accomplishment projection task',
    assigned_to: assignee.id,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'publish',
      idempotency_key: `native-projector:${randomUUID()}`,
      expected_head_revision: 0,
      creator_confirmed: true,
      constraints_addressed: true,
      dependencies_addressed: true,
      specification: {
        plain_text: 'Implement and verify the native review-confirmed accomplishment path.',
      },
      work_contract: {
        ...TASK_WORK_CONTRACT_V1_FIXTURE,
        roleInTask: 'backend_engineer',
        complexityContext: {
          novelty: 'new_domain_flow',
          risk: 'cross-service_consistency',
        },
        deliverables: TASK_WORK_CONTRACT_V1_FIXTURE.deliverables.map((item) => ({
          ...item,
          expectedFormat: 'openapi_spec',
        })),
      },
      evidence_contract: {
        ...TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
        verifierPolicy: {
          ...TASK_EVIDENCE_CONTRACT_V1_FIXTURE.verifierPolicy,
          reviewerIds: [reviewer.id],
        },
      },
    },
  })
  const assignment = await taskExternalDeps.assignments.findActiveByTask(task.id)
  if (!assignment) throw new Error('Native task must have an active assignment')
  const assignmentContracts = taskExternalDeps.assignmentContract
  if (!assignmentContracts) throw new Error('Native assignment contract composition is unavailable')
  const snapshotRecord = await assignmentContracts.repository.findCurrent(assignment.id)
  if (!snapshotRecord) throw new Error('Native assignment must have a current snapshot')
  const snapshot = snapshotRecord.envelope.snapshot
  await new AcknowledgeTaskAssignmentContractCommand(
    makeSystemTaskActionContext(assignee.id),
    taskAssignmentInteractionDependencies
  ).execute({
    assignmentId: assignment.id,
    snapshotId: snapshotRecord.id,
    snapshotHash: snapshotRecord.snapshotHash,
    contractVersionHead: snapshotRecord.sequence,
    idempotencyKey: `native-projector:ack:${randomUUID()}`,
  })
  const criterion = first(snapshot.resolvedContract.work.acceptanceCriteria)
  const deliverable = first(snapshot.resolvedContract.work.deliverables)
  const evidenceRequirement = first(snapshot.resolvedContract.evidence.requirements)
  const reportId = randomUUID()
  const criterionResultId = randomUUID()
  const evidenceId = randomUUID()
  const claimId = randomUUID()
  const taskSubmissionId = await submissionFor(task.id, assignment.id, assignee.id)
  const reportInput: PersistTaskCompletionReportInput = {
    taskSubmissionId,
    expectedRevision: 0,
    idempotencyKey: `native-completion:${randomUUID()}`,
    report: {
      id: reportId,
      taskId: task.id,
      taskAssignmentId: assignment.id,
      assignmentSnapshotId: snapshot.id,
      assignmentSnapshotHash: snapshot.snapshotHash,
      taskContractVersionId: snapshot.provenance.taskContractVersionId,
      reportedBy: assignee.id,
      workPerformed: 'Implemented and verified the native review-confirmed projection path.',
      contributionStatement: 'Owned the implementation and integration verification.',
      actualRole: 'backend_engineer',
      actualOwnership: snapshot.ownershipLevel,
      actualAutonomy: 'independent',
      actualDeliverableIds: [deliverable.id],
      actualOutcomes: { nativeSourceLoaded: true },
      impactObserved: { accomplishmentRowsPersisted: true },
      limitations: null,
      remainingWork: null,
      criterionResults: [
        {
          id: criterionResultId,
          criterionId: criterion.id,
          expectedOutcome: criterion.statement,
          actualOutcome: 'Native source and projection rows were verified.',
          result: 'met',
          explanation: 'The actual source reader loaded the persisted native facts.',
          evidenceIds: [evidenceId],
          deviationStatus: 'none',
          deviationSummary: null,
          deviationApprovalRef: null,
          notApplicableReason: null,
          notApplicablePolicyRef: null,
        },
      ],
      evidence: [
        {
          id: evidenceId,
          evidenceRequirementIds: [evidenceRequirement.id],
          criterionIds: [criterion.id],
          deliverableIds: [deliverable.id],
          ownerUserId: assignee.id,
          contributorUserIds: [assignee.id],
          reviewerAccessState: 'available',
          availability: 'available',
          privacyClassification: 'internal',
        },
      ],
      contributorClaims: [
        {
          id: claimId,
          contributorUserId: assignee.id,
          action: snapshot.resolvedContract.work.action,
          object: snapshot.resolvedContract.work.object,
          actualRole: 'backend_engineer',
          actualOwnership: snapshot.ownershipLevel,
          contributionStatement: 'Owned the native source and projection verification.',
          deliverableIds: [deliverable.id],
          criterionResultIds: [criterionResultId],
          evidenceIds: [evidenceId],
        },
      ],
    },
    evidenceManifest: [
      {
        evidenceId,
        evidenceType: 'integration_report',
        title: 'Native accomplishment projection report',
        description: 'Covers native source loading and aggregate persistence.',
        uri: 'https://evidence.example.test/native-accomplishment-projection',
        storageReference: null,
        versionReference: 'native-test-1',
        contentHash: null,
        capturedAt: null,
      },
    ],
  }
  const taskReportDependencies = {
    repository: new LucidTaskCompletionReportRepository(),
    assignmentContracts: assignmentContracts.repository,
    transactions: taskExternalDeps.transactions,
    hasher: new NodeTaskContractContentHasher(),
    idGenerator: new NodeTaskCompletionReportIdGenerator(),
  }
  const submitted = await new SubmitTaskCompletionReportCommand(
    makeSystemTaskActionContext(assignee.id),
    taskReportDependencies
  ).execute(reportInput)
  const contributorClaim = reportInput.report.contributorClaims[0]
  const evidence = reportInput.report.evidence[0]
  if (!contributorClaim || !evidence) throw new Error('Native completion report facts are incomplete')
  const taskHasher = new NodeTaskContractContentHasher()
  const claimHash = taskHasher.hash({
    completionReportHash: submitted.completionReportHash,
    claim: contributorClaim,
  })
  const workflowId = randomUUID()
  const observationFactId = randomUUID()
  const reviewObservation: ReviewObservationV1 = {
    schemaVersion: 'suar.review_observation.v1',
    id: observationFactId,
    reviewWorkflowId: workflowId,
    reviewSessionId: randomUUID(),
    reviewRevision: 1,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: null,
    assignmentSnapshotId: snapshot.id,
    sourceSnapshotHash: snapshot.snapshotHash,
    taskAssignmentId: assignment.id,
    subjectUserId: assignee.id,
    observationType: 'accomplishment_claim',
    targetRef: claimId,
    disposition: 'confirm',
    structuredValue: {
      action: contributorClaim.action,
      object: contributorClaim.object,
      actualOwnership: contributorClaim.actualOwnership,
      deliverableRefs: [deliverable.id],
      criterionResultRefs: [criterionResultId],
      evidenceRefs: [evidenceId],
    },
    rationale: 'Native completion facts satisfy the confirmed accomplishment claim.',
    evidenceRefs: [evidenceId],
    reviewerId: reviewer.id,
    reviewerType: 'human',
    confidence: 0.95,
    assessmentCeiling: null,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-08T08:00:00.000Z',
    finalizedAt: '2026-08-08T08:05:00.000Z',
  }
  await db.table('task_review_workflows').insert({
    id: workflowId,
    task_id: task.id,
    project_id: scenario.project.id,
    organization_id: scenario.organizationId,
    task_assignment_id: assignment.id,
    reviewee_id: assignee.id,
    status: 'done',
    required_review_count: 1,
    completed_review_count: 1,
    completed_at: new Date('2026-08-08T08:10:00.000Z'),
  })
  const observationInput: CreateReviewObservationInput = {
    idempotencyKey: `native-observation:${randomUUID()}`,
    observation: reviewObservation,
    reviewerRole: 'technical_reviewer',
    taskAssignmentHash: snapshot.snapshotHash,
    assignmentSnapshotHash: snapshot.snapshotHash,
    completionReportId: submitted.id,
    completionReportHash: submitted.completionReportHash,
    completionClaimId: claimId,
    completionClaimHash: claimHash,
    sourceSnapshotId: snapshot.id,
    taskContractVersionId: snapshot.provenance.taskContractVersionId,
    taskContractHash: snapshot.resolvedContract.resolvedContentHash,
    rationaleClassification: 'confidential',
    evidenceSufficiency: 'adequate',
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    disputeId: null,
    disputeFrozenAt: null,
    revisionPayload: { source: 'native-projector-integration' },
    evidenceLinks: [
      {
        evidenceId,
        relation: 'supports',
        accessClassification: 'internal',
        reviewerAccessState: 'available',
        evidenceHash: null,
      },
    ],
  }
  const persistedObservation = await new ReviewObservationRepository().createOrLoad(
    observationInput
  )
  const identity = {
    reviewWorkflowId: workflowId,
    completionClaimId: claimId,
    reviewFinalizedFactId: persistedObservation.observationFactId,
    reviewFinalizedFactHash: persistedObservation.revisionHash,
    projectionPolicyVersion: reviewObservation.reviewPolicyVersion,
  }
  return {
    identity,
    sourceReader: new LucidGovernedAccomplishmentProjectionSourceReader(),
    observation: reviewObservation,
    observationInput,
    persistedObservation,
  }
}

export async function cleanupAccomplishments(): Promise<void> {
  const rows = (await db
    .from('verified_work_accomplishments')
    .where('title', 'Proved review-confirmed accomplishment projection')
    .select('id')) as Array<{ id: string }>
  const ids = rows.map((row) => row.id)
  if (ids.length === 0) return

  for (const table of [
    'accomplishment_public_projections',
    'accomplishment_capability_signals',
    'accomplishment_review_observation_links',
    'accomplishment_evidence_links',
    'accomplishment_claim_links',
    'accomplishment_lifecycle_revisions',
  ]) {
    await db.from(table).whereIn('accomplishment_id', ids).delete()
  }
  await db.from('verified_work_accomplishments').whereIn('id', ids).delete()
}
