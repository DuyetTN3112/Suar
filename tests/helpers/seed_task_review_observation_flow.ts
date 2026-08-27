import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  taskAssignmentInteractionDependencies,
  taskExternalDeps,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import {
  SubmitTaskCompletionReportCommand,
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
import { ProjectMemberFactory, ReviewSessionFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export async function seedTaskReviewObservationFlow(seedKey: string) {
  const scenario = await CreateTaskScenario.build()
  const worker = await scenario.createOrgMember({
    email: `native-review-worker-${seedKey}@test.com`,
    username: `native_review_worker_${seedKey}`,
  })
  const manager = await scenario.createProjectManager()
  await ProjectMemberFactory.create({
    project_id: scenario.project.id,
    user_id: worker.id,
    project_role: 'project_member',
  })
  const evidenceContract = {
    ...TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
    verifierPolicy: {
      ...TASK_EVIDENCE_CONTRACT_V1_FIXTURE.verifierPolicy,
      reviewerIds: [manager.id],
    },
  }

  const task = await scenario.create({
    title: 'Native claim verification fixture',
    description: 'A real assignment snapshot and Completion Report for reviewer role-play.',
    assigned_to: worker.id,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'publish',
      idempotency_key: `native-review-task:${crypto.randomUUID()}`,
      expected_head_revision: 0,
      creator_confirmed: true,
      constraints_addressed: true,
      dependencies_addressed: true,
      specification: { plain_text: 'Verify the claim with linked evidence.' },
      work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
      evidence_contract: evidenceContract,
    },
  })
  const doneStatus = (await db
    .from('task_statuses')
    .where({ organization_id: scenario.organizationId, category: 'done' })
    .whereNull('deleted_at')
    .first()) as { id?: string } | undefined
  if (!doneStatus?.id) throw new Error('Native review fixture done status was not seeded')
  await db
    .from('tasks')
    .where('id', task.id)
    .update({ task_status_id: doneStatus.id, status: 'done' })
  const assignment = await taskExternalDeps.assignments.findActiveByTask(task.id)
  if (!assignment) throw new Error('Native review fixture assignment was not created')
  const assignmentContract = taskExternalDeps.assignmentContract
  if (!assignmentContract)
    throw new Error('Native review fixture contract composition is unavailable')
  const snapshotRecord = await assignmentContract.repository.findCurrent(assignment.id)
  if (!snapshotRecord) throw new Error('Native review fixture snapshot was not created')

  const snapshot = snapshotRecord.envelope.snapshot
  const criterion = snapshot.resolvedContract.work.acceptanceCriteria[0]
  const deliverable = snapshot.resolvedContract.work.deliverables[0]
  const evidenceRequirement = snapshot.resolvedContract.evidence.requirements[0]
  if (!criterion || !deliverable || !evidenceRequirement) {
    throw new Error('Native review fixture contract is missing required golden fixture entries')
  }

  await new AcknowledgeTaskAssignmentContractCommand(
    makeSystemTaskActionContext(worker.id),
    taskAssignmentInteractionDependencies
  ).execute({
    assignmentId: assignment.id,
    snapshotId: snapshotRecord.id,
    snapshotHash: snapshotRecord.snapshotHash,
    contractVersionHead: snapshotRecord.sequence,
    idempotencyKey: `native-review-ack:${crypto.randomUUID()}`,
  })

  const evidenceId = crypto.randomUUID()
  const criterionResultId = crypto.randomUUID()
  const claimId = crypto.randomUUID()
  const started = await new StartTaskCompletionReportCommand(
    makeSystemTaskActionContext(worker.id),
    {
      repository: taskExternalDeps.completion,
      assignmentContracts: assignmentContract.repository,
      transactions: taskExternalDeps.transactions,
    }
  ).execute(assignment.id)
  if (started.taskId !== task.id || started.assigneeId !== worker.id) {
    throw new Error('Native review fixture start returned the wrong assignment identity')
  }

  const input: PersistTaskCompletionReportInput = {
    taskSubmissionId: started.taskSubmissionId,
    expectedRevision: 0,
    idempotencyKey: `native-review-report:${crypto.randomUUID()}`,
    report: {
      id: crypto.randomUUID(),
      taskId: task.id,
      taskAssignmentId: assignment.id,
      assignmentSnapshotId: snapshot.id,
      assignmentSnapshotHash: snapshot.snapshotHash,
      taskContractVersionId: snapshot.provenance.taskContractVersionId,
      reportedBy: worker.id,
      workPerformed: 'Implemented the requested workflow and verified the linked behavior.',
      contributionStatement: 'Owned implementation and verification of the workflow.',
      actualRole: snapshot.roleInTask,
      actualOwnership: snapshot.ownershipLevel,
      actualAutonomy: 'independent',
      actualDeliverableIds: [deliverable.id],
      actualOutcomes: { verification: 'passed' },
      impactObserved: { reviewReady: true },
      limitations: null,
      remainingWork: null,
      criterionResults: [
        {
          id: criterionResultId,
          criterionId: criterion.id,
          expectedOutcome: criterion.statement,
          actualOutcome: 'The workflow and verification checks passed.',
          result: 'met',
          explanation: 'Captured by the native integration fixture.',
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
          ownerUserId: worker.id,
          contributorUserIds: [worker.id],
          reviewerAccessState: 'available',
          availability: 'available',
          privacyClassification: 'internal',
        },
      ],
      contributorClaims: [
        {
          id: claimId,
          contributorUserId: worker.id,
          action: snapshot.resolvedContract.work.action,
          object: snapshot.resolvedContract.work.object,
          actualRole: snapshot.roleInTask,
          actualOwnership: snapshot.ownershipLevel,
          contributionStatement: 'Owned implementation and verification.',
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
        title: 'Native workflow verification report',
        description: 'Evidence linked to the Completion Report claim.',
        uri: 'https://evidence.example.test/native-review-flow',
        storageReference: null,
        versionReference: 'native-fixture-1',
        contentHash: null,
        capturedAt: null,
      },
    ],
  }
  const completion = await new SubmitTaskCompletionReportCommand(
    makeSystemTaskActionContext(worker.id),
    {
      repository: new LucidTaskCompletionReportRepository(),
      assignmentContracts: assignmentContract.repository,
      transactions: taskExternalDeps.transactions,
      hasher: new NodeTaskContractContentHasher(),
      idGenerator: new NodeTaskCompletionReportIdGenerator(),
    }
  ).execute(input)

  const reviewSession = await ReviewSessionFactory.create({
    id: testId(),
    task_assignment_id: assignment.id,
    reviewee_id: worker.id,
    status: 'in_progress',
    required_total_reviews: 1,
    minimum_manager_reviews: 1,
    minimum_peer_reviews: 0,
  })
  const workflowId = testId()
  const now = new Date().toISOString()
  await db.table('review_session_reviewer_assignments').insert({
    id: testId(),
    review_session_id: reviewSession.id,
    reviewer_id: manager.id,
    reviewer_type: 'manager',
    assignment_role: 'manager_required',
    is_required: true,
    status: 'pending',
    created_at: now,
    updated_at: now,
  })
  await db.table('task_review_workflows').insert({
    id: workflowId,
    task_id: task.id,
    task_assignment_id: assignment.id,
    project_id: scenario.project.id,
    organization_id: scenario.organizationId,
    reviewee_id: worker.id,
    status: 'awaiting_review',
    required_review_count: 1,
    completed_review_count: 0,
    created_at: now,
    updated_at: now,
  })
  await db.table('task_review_reviewers').insert({
    id: testId(),
    workflow_id: workflowId,
    reviewer_id: manager.id,
    reviewer_role: 'backend_lead',
    is_required: true,
    status: 'pending',
    priority_rank: 1,
    created_at: now,
    updated_at: now,
  })

  return {
    organizationId: scenario.organizationId,
    projectId: scenario.project.id,
    managerEmail: manager.email,
    workerEmail: worker.email,
    managerId: manager.id,
    workerId: worker.id,
    taskId: task.id,
    assignmentId: assignment.id,
    workflowId,
    reviewSessionId: reviewSession.id,
    assignmentSnapshotId: snapshot.id,
    completionReportId: completion.id,
    claimId,
    evidenceId,
  }
}
