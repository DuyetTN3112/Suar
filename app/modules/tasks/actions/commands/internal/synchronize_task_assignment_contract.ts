import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  TaskAssignmentContractRepository,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskAssignmentRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskContractContentHasher } from '#modules/tasks/actions/ports/outbound/task_contract_content_hasher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskResolvedBriefReader } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  buildTaskAssignmentContractSnapshot,
  type TaskAssignmentAcknowledgementBasisV1,
} from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import { pinTaskAssignmentTaxonomyMetadata } from '#modules/tasks/domain/task-assignment/task_assignment_taxonomy_metadata'
import {
  classifyTaskContractChangeV1,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  type TaskContractChangeDecisionV1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export interface SynchronizeTaskAssignmentContractDependencies {
  readonly resolvedBriefReader: TaskResolvedBriefReader
  readonly repository: TaskAssignmentContractRepository
  readonly hasher: TaskContractContentHasher
  readonly identityFactory: { nextId(): string }
  readonly clock: { nowIso(): string }
  readonly metadataAssignmentProvider?: TaskExternalDependencies['metadataAssignmentProvider']
}

export interface SynchronizeTaskAssignmentContractInput {
  readonly assignment: TaskAssignmentRecord
  readonly organizationId: string
  readonly projectId: string | null
  readonly projectBusinessDomains?: readonly string[]
  readonly workLifecycle:
    | 'assigned'
    | 'in_progress'
    | 'review'
    | 'dispute'
    | 'legacy_unpinned_workflow'
}

export type SynchronizeTaskAssignmentContractResult =
  | Readonly<{ state: 'legacy_unversioned'; snapshot: null }>
  | Readonly<{ state: 'current'; snapshot: TaskAssignmentContractSnapshotRecord }>
  | Readonly<{ state: 'persisted'; snapshot: TaskAssignmentContractSnapshotRecord }>

function workLifecycle(
  task: TaskRecord,
  reviewLifecycle: 'review' | 'dispute' | 'legacy_unpinned_workflow' | null
): SynchronizeTaskAssignmentContractInput['workLifecycle'] {
  if (reviewLifecycle) return reviewLifecycle
  if (task.status === 'in_review') return 'review'
  if (task.status === 'in_progress') return 'in_progress'
  return 'assigned'
}

export async function synchronizeTaskAssignmentContractForTask(
  assignment: TaskAssignmentRecord,
  task: TaskRecord,
  transaction: TaskTransaction,
  externalDependencies: TaskExternalDependencies
): Promise<SynchronizeTaskAssignmentContractResult | null> {
  const coordination = externalDependencies.assignmentContract
  const resolvedBriefReader = externalDependencies.resolvedBrief
  if (!coordination) {
    throw new DependencyUnavailableException(
      'task_assignment_contract',
      'synchronize_assignment_contract'
    )
  }
  if (!resolvedBriefReader) {
    throw new DependencyUnavailableException(
      'task_resolved_brief_reader',
      'synchronize_assignment_contract'
    )
  }
  if (assignment.task_id !== task.id) {
    throw new InvariantViolationException('Assignment and Task mismatch during Contract snapshot')
  }
  if (typeof externalDependencies.review.getTaskAssignmentContractLifecycle !== 'function') {
    throw new DependencyUnavailableException(
      'task_review_reader',
      'read_assignment_contract_lifecycle'
    )
  }
  let reviewLifecycle: 'review' | 'dispute' | 'legacy_unpinned_workflow' | null
  try {
    reviewLifecycle = await externalDependencies.review.getTaskAssignmentContractLifecycle(
      task.id,
      assignment.id,
      transaction
    )
  } catch (error) {
    if (error instanceof DependencyUnavailableException) throw error
    throw new DependencyUnavailableException(
      'task_review_reader',
      'read_assignment_contract_lifecycle',
      { cause: error }
    )
  }
  return synchronizeTaskAssignmentContract(
    {
      assignment,
      organizationId: task.organization_id,
      projectId: task.project_id ?? null,
      projectBusinessDomains: task.project_business_domains ?? [],
      workLifecycle: workLifecycle(task, reviewLifecycle),
    },
    transaction,
    {
      ...coordination,
      resolvedBriefReader,
      ...(externalDependencies.metadataAssignmentProvider
        ? { metadataAssignmentProvider: externalDependencies.metadataAssignmentProvider }
        : {}),
    }
  )
}

function predecessorState(
  current: TaskAssignmentContractSnapshotRecord
): 'pending' | 'acknowledged' | 'clarification_requested' {
  if (current.acknowledgementState === 'not_required') {
    throw new InvariantViolationException(
      'Assignment Contract successor cannot derive acknowledgement from a non-governed predecessor'
    )
  }
  return current.acknowledgementState
}

export async function synchronizeTaskAssignmentContract(
  input: SynchronizeTaskAssignmentContractInput,
  transaction: TaskTransaction,
  dependencies: SynchronizeTaskAssignmentContractDependencies
): Promise<SynchronizeTaskAssignmentContractResult> {
  const bundle = await dependencies.resolvedBriefReader.readCurrentBundle(
    input.assignment.task_id,
    transaction
  )
  if (!bundle) return { state: 'legacy_unversioned', snapshot: null }
  if (!bundle.contract || !bundle.workFieldProvenance) {
    const readinessCodes = bundle.readiness.blockers.map((finding) => finding.code)
    const codes = readinessCodes.length > 0 ? readinessCodes : ['TVA.ASSIGNMENT.WORK_NOT_READY']
    throw new BusinessLogicException(codes.join(', '), { reasonCodes: codes })
  }

  const current = await dependencies.repository.findCurrent(input.assignment.id, transaction)
  if (
    current?.envelope.snapshot.provenance.taskContractVersionId === bundle.contract.id
  ) {
    return { state: 'current', snapshot: current }
  }

  const taxonomyMetadata = dependencies.metadataAssignmentProvider
    ? pinTaskAssignmentTaxonomyMetadata(
        input.assignment.task_id,
        await dependencies.metadataAssignmentProvider.getAssignments(
          {
            resource: 'task',
            entityIds: [input.assignment.task_id],
            // Only the skills taxonomy has a published, domain-owned revision
            // in this deployment. The task scalar/JSON fields are legacy
            // inputs and their four canonical catalogs intentionally remain
            // unavailable until an owning provider publishes a revision. Do
            // not make assigning an otherwise valid task depend on unpublished
            // catalogs (the Search reader follows the same boundary).
            namespaces: ['skills'],
          },
          {
            attributes: {
              authorizedTaskIds: [input.assignment.task_id],
              authorizedOrganizationIds: [input.organizationId],
            },
          }
        )
      )
    : undefined

  let acknowledgementRequired = true
  let changeDecision: TaskContractChangeDecisionV1 = INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1
  let acknowledgementBasis: TaskAssignmentAcknowledgementBasisV1 = {
    kind: 'fresh_assignment',
    previousSnapshotId: null,
    previousAcknowledgementState: null,
    changeClass: 'initial',
  }
  if (current) {
    const change = classifyTaskContractChangeV1({
      previous: current.envelope.snapshot.resolvedContract,
      next: bundle.contract.resolvedContract,
    })
    changeDecision = change
    if (change.changeClass === 'initial') {
      throw new InvariantViolationException(
        'Successor Contract classifier returned an initial-only decision'
      )
    }
    const changeClass = change.changeClass ?? 'editorial'
    if (change.requiresReack && input.workLifecycle === 'legacy_unpinned_workflow') {
      throw new BusinessLogicException(
        'TVA.ASSIGNMENT.LEGACY_UNPINNED_WORKFLOW_PROVENANCE_REQUIRED',
        { reasonCode: 'TVA.ASSIGNMENT.LEGACY_UNPINNED_WORKFLOW_PROVENANCE_REQUIRED' }
      )
    }
    if (change.requiresReack && (input.workLifecycle === 'review' || input.workLifecycle === 'dispute')) {
      throw new BusinessLogicException(
        'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED',
        { reasonCode: 'TVA.ASSIGNMENT.GOVERNED_SUCCESSOR_CYCLE_REQUIRED' }
      )
    }
    const previousAcknowledgementState = predecessorState(current)
    if (!change.requiresReack && previousAcknowledgementState === 'acknowledged') {
      acknowledgementRequired = false
      acknowledgementBasis = {
        kind: 'acknowledgement_carried_forward',
        previousSnapshotId: current.id,
        previousAcknowledgementState: 'acknowledged',
        changeClass:
          changeClass === 'editorial' ||
          changeClass === 'clarification' ||
          changeClass === 'deadline_priority'
            ? changeClass
            : 'editorial',
      }
    } else {
      acknowledgementBasis = {
        kind: 'reacknowledgement_required',
        previousSnapshotId: current.id,
        previousAcknowledgementState,
        changeClass,
      }
    }
  }

  const built = buildTaskAssignmentContractSnapshot({
    snapshotId: dependencies.identityFactory.nextId(),
    assignmentId: input.assignment.id,
    taskId: input.assignment.task_id,
    organizationId: input.organizationId,
    projectId: input.projectId,
    assigneeId: input.assignment.assignee_id,
    assignedBy: input.assignment.assigned_by,
    contract: bundle.contract,
    workFieldProvenance: bundle.workFieldProvenance,
    readinessFindingCodesResolved: bundle.readinessFindingCodesResolved,
    acknowledgementRequired,
    acknowledgementBasis,
    changeDecision,
    previousResolvedContract: current?.envelope.snapshot.resolvedContract ?? null,
    ...(input.projectBusinessDomains === undefined
      ? {}
      : { projectBusinessDomains: input.projectBusinessDomains }),
    ...(taxonomyMetadata === undefined ? {} : { taxonomyMetadata }),
    createdAt: current ? dependencies.clock.nowIso() : input.assignment.assigned_at,
    hasher: dependencies.hasher,
  })
  if (!built.allowed) {
    throw new BusinessLogicException(built.blockerCodes.join(', '), {
      reasonCodes: built.blockerCodes,
    })
  }

  const snapshot = await dependencies.repository.persistSnapshot(
    {
      envelope: built.value,
      idempotencyKey: `${input.assignment.id}:${bundle.contract.id}`,
      expectedHeadRevision: current?.sequence ?? 0,
    },
    transaction
  )
  return { state: 'persisted', snapshot }
}
