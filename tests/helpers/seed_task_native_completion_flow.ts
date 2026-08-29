import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import {
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import { ProjectMemberFactory } from '#tests/helpers/factories'

const TASK_TITLE = 'Native Completion Report authoring fixture'

export async function seedTaskNativeCompletionFlow(seedKey: string) {
  const scenario = await CreateTaskScenario.build()
  const worker = await scenario.createOrgMember({
    email: `native-completion-worker-${seedKey}@test.com`,
    username: `native_completion_worker_${seedKey}`,
  })
  await ProjectMemberFactory.create({
    project_id: scenario.project.id,
    user_id: worker.id,
    project_role: 'project_manager',
  })

  const task = await scenario.create({
    title: TASK_TITLE,
    description: 'A published assignment snapshot for native Completion Report authoring.',
    assigned_to: worker.id,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'publish',
      idempotency_key: `native-completion-task:${crypto.randomUUID()}`,
      expected_head_revision: 0,
      creator_confirmed: true,
      constraints_addressed: true,
      dependencies_addressed: true,
      specification: { plain_text: 'Complete the work and report the verified result.' },
      work_contract: TASK_WORK_CONTRACT_V1_FIXTURE,
      evidence_contract: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
    },
  })

  const doneStatus = (await db
    .from('task_statuses')
    .where({ organization_id: scenario.organizationId, category: 'in_progress' })
    .whereNull('deleted_at')
    .first()) as { id?: string } | undefined
  if (!doneStatus?.id)
    throw new Error('Native completion fixture in-progress status was not seeded')
  await db
    .from('tasks')
    .where('id', task.id)
    .update({ task_status_id: doneStatus.id, status: 'in_progress' })

  const assignment = await taskExternalDeps.assignments.findActiveByTask(task.id)
  if (!assignment) throw new Error('Native completion fixture assignment was not created')
  const assignmentContract = taskExternalDeps.assignmentContract
  if (!assignmentContract)
    throw new Error('Native completion fixture contract composition is unavailable')
  const snapshotRecord = await assignmentContract.repository.findCurrent(assignment.id)
  if (!snapshotRecord) throw new Error('Native completion fixture snapshot was not created')

  const snapshot = snapshotRecord.envelope.snapshot
  const criterion = snapshot.resolvedContract.work.acceptanceCriteria[0]
  const deliverable = snapshot.resolvedContract.work.deliverables[0]
  const evidenceRequirement = snapshot.resolvedContract.evidence.requirements[0]
  if (!criterion || !deliverable || !evidenceRequirement) {
    throw new Error('Native completion fixture contract is missing required golden fixture entries')
  }

  return {
    organizationId: scenario.organizationId,
    projectId: scenario.project.id,
    workerEmail: worker.email,
    workerId: worker.id,
    taskId: task.id,
    taskTitle: TASK_TITLE,
    assignmentId: assignment.id,
    assignmentSnapshotId: snapshot.id,
    assignmentSnapshotHash: snapshot.snapshotHash,
    criterionId: criterion.id,
    deliverableId: deliverable.id,
    evidenceRequirementId: evidenceRequirement.id,
  }
}
