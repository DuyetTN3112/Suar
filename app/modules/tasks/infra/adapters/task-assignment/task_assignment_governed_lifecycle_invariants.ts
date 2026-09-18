import { isDeepStrictEqual } from 'node:util'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import { TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES } from '#modules/tasks/domain/task-assignment/task_assignment_acknowledgement_rules'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import { deriveResolvedReadinessFindingCodes } from '#modules/tasks/domain/task-authoring/task_readiness_resolution_history'
import { mapTaskReadinessAssessmentModel } from '#modules/tasks/infra/adapters/task-authoring/task_contract_model_mapper'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'

export type GovernedAssignmentLifecycle = 'review' | 'dispute' | 'legacy_unpinned_workflow'

export const ACTIVE_REVIEW_DISPUTE_STATUSES: string[] = [
  'pending',
  'collecting_evidence',
  'admin_reviewing',
  'ai_reviewing',
]

export async function findGovernedAssignmentLifecycle(
  trx: TransactionClientContract,
  taskId: string,
  assignmentId: string
): Promise<GovernedAssignmentLifecycle | null> {
  const activeDispute = (await trx
    .from('review_disputes')
    .where('task_id', taskId)
    .where('task_assignment_id', assignmentId)
    .whereIn('status', ACTIVE_REVIEW_DISPUTE_STATUSES)
    .select('id')
    .first()) as { id: string } | undefined
  if (activeDispute) return 'dispute'

  const activeReview = (await trx
    .from('review_sessions as rs')
    .join('task_assignments as ta', 'ta.id', 'rs.task_assignment_id')
    .where('ta.task_id', taskId)
    .where('rs.task_assignment_id', assignmentId)
    .whereIn('rs.status', ['pending', 'in_progress', 'disputed'])
    .orderBy('rs.created_at', 'desc')
    .select('rs.status')
    .first()) as { status: string } | undefined
  const taskWorkflow = (await trx
    .from('task_review_workflows as trw')
    .where('trw.task_assignment_id', assignmentId)
    .where('trw.task_id', taskId)
    .orderBy('trw.updated_at', 'desc')
    .select('trw.status')
    .first()) as { status: string } | undefined
  const legacyWorkflow = (await trx
    .from('task_review_workflows as trw')
    .where('trw.task_id', taskId)
    .whereNull('trw.task_assignment_id')
    .whereIn('trw.status', [
      'awaiting_review',
      'in_review',
      'awaiting_response',
      'disputed',
      'reported',
      'ai_reviewing',
    ])
    .select('trw.id')
    .first()) as { id: string } | undefined

  if (
    activeReview?.status === 'disputed' ||
    (taskWorkflow && ['disputed', 'reported', 'ai_reviewing'].includes(taskWorkflow.status))
  ) {
    return 'dispute'
  }
  if (
    activeReview ||
    (taskWorkflow &&
      ['awaiting_review', 'in_review', 'awaiting_response'].includes(taskWorkflow.status))
  ) {
    return 'review'
  }
  if (legacyWorkflow) return 'legacy_unpinned_workflow'
  return null
}

export async function assertGovernedSuccessorPersistenceAllowed(input: {
  readonly trx: TransactionClientContract
  readonly taskId: string
  readonly assignmentId: string
  readonly reacknowledgementRequired: boolean
}): Promise<void> {
  if (!input.reacknowledgementRequired) return

  const lifecycle = await findGovernedAssignmentLifecycle(
    input.trx,
    input.taskId,
    input.assignmentId
  )
  if (!lifecycle) return

  const reasonCode =
    lifecycle === 'legacy_unpinned_workflow'
      ? TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.legacyUnpinnedWorkflowProvenanceRequired
      : TASK_ASSIGNMENT_ACKNOWLEDGEMENT_CODES.governedSuccessorCycleRequired
  throw new ConflictException(reasonCode, { reasonCode, workLifecycle: lifecycle })
}

export async function assertResolvedReadinessHistoryIntegrity(input: {
  readonly trx: TransactionClientContract
  readonly envelope: CanonicalTaskAssignmentContractSnapshotV1
  readonly hasher: TaskContractContentHasher
}): Promise<void> {
  const canonical = input.envelope.snapshot
  const assessments = await TaskReadinessAssessment.query({ client: input.trx })
    .where('task_id', canonical.taskId)
    .orderBy('assessed_at', 'asc')
    .orderBy('id', 'asc')
  let currentIndex = -1
  for (let index = assessments.length - 1; index >= 0; index -= 1) {
    const assessment = assessments[index]
    if (
      assessment?.task_specification_version_id ===
        canonical.provenance.taskSpecificationVersionId &&
      assessment.task_contract_version_id === canonical.provenance.taskContractVersionId
    ) {
      currentIndex = index
      break
    }
  }
  const currentAssessment = assessments[currentIndex]
  if (!currentAssessment) {
    throw new InvariantViolationException(
      'Assignment Contract snapshot references a Contract without immutable readiness history'
    )
  }
  const current = mapTaskReadinessAssessmentModel(currentAssessment)
  const expectedResolvedCodes = deriveResolvedReadinessFindingCodes({
    historical: assessments
      .slice(0, currentIndex + 1)
      .map((assessment) => mapTaskReadinessAssessmentModel(assessment)),
    current,
  })
  if (
    input.hasher.hash(current) !== input.hasher.hash(canonical.resolvedContract.readiness) ||
    !isDeepStrictEqual(canonical.readinessFindingCodesResolved, expectedResolvedCodes)
  ) {
    throw new InvariantViolationException(
      'Assignment Contract readiness history does not match immutable authoring assessments'
    )
  }
}
