import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  taskAssignmentInteractionDependencies,
  taskExternalDeps,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import {
  type PersistTaskCompletionReportInput,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import StartTaskCompletionReportCommand from '#modules/tasks/actions/commands/task-submissions/start_task_completion_report_command'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskCompletionReportRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_report_repository'
import { NodeTaskCompletionReportIdGenerator } from '#modules/tasks/infra/adapters/task-submissions/node_task_completion_report_id_generator'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import {
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import { ProjectMemberFactory } from '#tests/helpers/factories'

export function first<T>(values: readonly T[]): T {
  const value = values[0]
  if (value === undefined) throw new Error('Test fixture must contain at least one value')
  return value
}

export function reportContext(input: PersistTaskCompletionReportInput) {
  return makeSystemTaskActionContext(input.report.reportedBy)
}

export async function submissionFor(taskId: string, assignmentId: string, assigneeId: string): Promise<string> {
  const assignmentContract = taskExternalDeps.assignmentContract
  if (!assignmentContract) throw new Error('Task assignment Contract composition is unavailable')
  const started = await new StartTaskCompletionReportCommand(
    makeSystemTaskActionContext(assigneeId),
    {
      repository: taskExternalDeps.completion,
      assignmentContracts: assignmentContract.repository,
      transactions: taskExternalDeps.transactions,
    }
  ).execute(assignmentId)
  if (started.taskId !== taskId) throw new Error('Task submission fixture crossed task identity')
  return started.taskSubmissionId
}

export async function cleanupCompletionReports(): Promise<void> {
  await db.from('task_completion_evidence_mappings').delete()
  await db.from('task_completion_contributor_claims').delete()
  await db.from('task_completion_evidence_manifest').delete()
  await db.from('task_completion_criterion_results').delete()
  await db.from('task_completion_reports').delete()
}

export function dependencies() {
  const assignmentContract = taskExternalDeps.assignmentContract
  if (!assignmentContract) throw new Error('Task assignment Contract composition is unavailable')
  return {
    repository: new LucidTaskCompletionReportRepository(),
    assignmentContracts: assignmentContract.repository,
    transactions: taskExternalDeps.transactions,
    hasher: new NodeTaskContractContentHasher(),
    idGenerator: new NodeTaskCompletionReportIdGenerator(),
  }
}

export async function validInput(
  overrides: Partial<PersistTaskCompletionReportInput> = {}
): Promise<PersistTaskCompletionReportInput> {
  const scenario = await CreateTaskScenario.build()
  const assignee = await scenario.createOrgMember()
  await ProjectMemberFactory.create({
    project_id: scenario.project.id,
    user_id: assignee.id,
    project_role: 'project_member',
  })
  const reviewer = await scenario.createProjectManager()
  const task = await scenario.create({
    title: 'Completion Report persistence task',
    assigned_to: assignee.id,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'publish',
      idempotency_key: `completion-contract:${crypto.randomUUID()}`,
      expected_head_revision: 0,
      creator_confirmed: true,
      constraints_addressed: true,
      dependencies_addressed: true,
      specification: { plain_text: 'Implement and verify the pre-order API lifecycle.' },
      work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
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
  if (!assignment) throw new Error('Assigned task must have an active assignment')
  const assignmentContract = taskExternalDeps.assignmentContract
  if (!assignmentContract) throw new Error('Task assignment Contract composition is unavailable')
  const snapshotRecord = await assignmentContract.repository.findCurrent(assignment.id)
  if (!snapshotRecord) throw new Error('Assigned task must have a current Contract snapshot')
  const snapshot = snapshotRecord.envelope.snapshot
  await new AcknowledgeTaskAssignmentContractCommand(
    makeSystemTaskActionContext(assignee.id),
    taskAssignmentInteractionDependencies
  ).execute({
    assignmentId: assignment.id,
    snapshotId: snapshotRecord.id,
    snapshotHash: snapshotRecord.snapshotHash,
    contractVersionHead: snapshotRecord.sequence,
    idempotencyKey: `completion:ack:${crypto.randomUUID()}`,
  })
  const criterion = first(snapshot.resolvedContract.work.acceptanceCriteria)
  const deliverable = first(snapshot.resolvedContract.work.deliverables)
  const evidenceRequirement = first(snapshot.resolvedContract.evidence.requirements)
  const reportId = crypto.randomUUID()
  const criterionResultId = crypto.randomUUID()
  const evidenceId = crypto.randomUUID()
  const claimId = crypto.randomUUID()
  const taskSubmissionId = await submissionFor(task.id, assignment.id, assignee.id)

  return {
    taskSubmissionId,
    expectedRevision: 0,
    idempotencyKey: `completion:${crypto.randomUUID()}`,
    report: {
      id: reportId,
      taskId: task.id,
      taskAssignmentId: assignment.id,
      assignmentSnapshotId: snapshot.id,
      assignmentSnapshotHash: snapshot.snapshotHash,
      taskContractVersionId: snapshot.provenance.taskContractVersionId,
      reportedBy: assignee.id,
      workPerformed: 'Designed the API lifecycle and implemented idempotent command handling.',
      contributionStatement: 'Owned the API design, implementation, and integration verification.',
      actualRole: snapshot.roleInTask,
      actualOwnership: snapshot.ownershipLevel,
      actualAutonomy: 'independent',
      actualDeliverableIds: [deliverable.id],
      actualOutcomes: { integrationSuite: 'passed' },
      impactObserved: { observed: 'Pre-order lifecycle verified in staging.' },
      limitations: null,
      remainingWork: null,
      criterionResults: [
        {
          id: criterionResultId,
          criterionId: criterion.id,
          expectedOutcome: criterion.statement,
          actualOutcome: 'Lifecycle, errors, and idempotency flows passed.',
          result: 'met',
          explanation: 'Observed in the linked integration report.',
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
          actualRole: snapshot.roleInTask,
          actualOwnership: snapshot.ownershipLevel,
          contributionStatement: 'Owned implementation and verification scope.',
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
        title: 'Pre-order API integration report',
        description: 'Covers lifecycle, errors, and idempotency.',
        uri: 'https://evidence.example.test/pre-order-api-integration',
        storageReference: null,
        versionReference: 'build-42',
        contentHash: null,
        capturedAt: null,
      },
    ],
    ...overrides,
  }
}
