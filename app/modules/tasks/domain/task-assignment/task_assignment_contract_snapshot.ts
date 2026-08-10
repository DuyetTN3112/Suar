import {
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  verifyTaskContractChangeDecision,
  type TaskContractChangeDecisionV1,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import type { TvaChangeClass } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  TaskAssignmentSnapshotV1,
  TaskAssignmentTaxonomyMetadataV1,
  TaskContractVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import type { TaskAssignmentIdentityHasher } from '#modules/tasks/public_contracts/task_assignment_identity'
export {
  hashTaskAssignmentIdentity,
  TASK_ASSIGNMENT_IDENTITY_V1,
  taskAssignmentIdentityHashInput,
  type TaskAssignmentIdentityHasher,
} from '#modules/tasks/public_contracts/task_assignment_identity'
export type TaskAssignmentSnapshotHasher = TaskAssignmentIdentityHasher

export const TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES = {
  taskMismatch: 'TVA.ASSIGNMENT.TASK_CONTRACT_MISMATCH',
  assignmentNotReady: 'TVA.ASSIGNMENT.WORK_NOT_READY',
  evidenceNotReady: 'TVA.ASSIGNMENT.EVIDENCE_NOT_READY',
  creatorConfirmationMissing: 'TVA.ASSIGNMENT.CREATOR_CONFIRMATION_MISSING',
  projectMissing: 'TVA.ASSIGNMENT.PROJECT_REQUIRED',
  resolutionProvenanceMissing: 'TVA.ASSIGNMENT.RESOLUTION_PROVENANCE_MISSING',
  acknowledgementBasisInvalid: 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_BASIS_INVALID',
  changeDecisionInvalid: 'TVA.ASSIGNMENT.CHANGE_DECISION_INVALID',
} as const

export type TaskAssignmentSnapshotBlockerCode =
  (typeof TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES)[keyof typeof TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES]

export interface CanonicalTaskAssignmentContractSnapshotV1 {
  readonly schemaVersion: 'suar.task_assignment_contract_snapshot.v1'
  readonly snapshot: TaskAssignmentSnapshotV1
  readonly workFieldProvenance: TaskWorkContractResolutionResult['provenance']
  readonly acknowledgementBasis: TaskAssignmentAcknowledgementBasisV1
  readonly changeDecision: TaskContractChangeDecisionV1
}

export type TaskAssignmentAcknowledgementBasisV1 =
  | Readonly<{
      kind: 'fresh_assignment'
      previousSnapshotId: null
      previousAcknowledgementState: null
      changeClass: 'initial'
    }>
  | Readonly<{
      kind: 'reacknowledgement_required'
      previousSnapshotId: string
      previousAcknowledgementState: 'pending' | 'acknowledged' | 'clarification_requested'
      changeClass: Exclude<TvaChangeClass, 'initial'>
    }>
  | Readonly<{
      kind: 'acknowledgement_carried_forward'
      previousSnapshotId: string
      previousAcknowledgementState: 'acknowledged'
      changeClass: 'editorial' | 'clarification' | 'deadline_priority'
    }>

export type BuildTaskAssignmentContractSnapshotResult =
  | {
      readonly allowed: true
      readonly value: CanonicalTaskAssignmentContractSnapshotV1
      readonly blockerCodes: readonly []
    }
  | {
      readonly allowed: false
      readonly value: null
      readonly blockerCodes: readonly TaskAssignmentSnapshotBlockerCode[]
    }

function snapshotHashInput(
  snapshot: Omit<TaskAssignmentSnapshotV1, 'snapshotHash'>,
  workFieldProvenance: TaskWorkContractResolutionResult['provenance'],
  acknowledgementBasis: TaskAssignmentAcknowledgementBasisV1,
  changeDecision: TaskContractChangeDecisionV1
) {
  return {
    envelopeSchemaVersion: 'suar.task_assignment_contract_snapshot.v1',
    snapshot,
    workFieldProvenance,
    acknowledgementBasis,
    changeDecision,
  }
}

function blockerCodes(input: {
  taskId: string
  projectId: string | null
  contract: TaskContractVersionV1
  workFieldProvenance: TaskWorkContractResolutionResult['provenance']
}): TaskAssignmentSnapshotBlockerCode[] {
  const codes: TaskAssignmentSnapshotBlockerCode[] = []
  const { contract } = input
  if (contract.taskId !== input.taskId || contract.resolvedContract.taskId !== input.taskId) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.taskMismatch)
  }
  if (!contract.resolvedContract.readiness.assignmentReady) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.assignmentNotReady)
  }
  if (
    contract.evidenceContract.mode === 'evidence_enabled' &&
    !contract.resolvedContract.readiness.evidenceReady
  ) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.evidenceNotReady)
  }
  if (!contract.creatorConfirmedBy || !contract.creatorConfirmedAt) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.creatorConfirmationMissing)
  }
  if (!input.projectId) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.projectMissing)
  }
  if (Object.keys(input.workFieldProvenance).length === 0) {
    codes.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.resolutionProvenanceMissing)
  }
  return [...new Set(codes)].sort()
}

export function buildTaskAssignmentContractSnapshot(input: {
  snapshotId: string
  assignmentId: string
  taskId: string
  organizationId: string
  projectId: string | null
  assigneeId: string
  assignedBy: string
  contract: TaskContractVersionV1
  workFieldProvenance: TaskWorkContractResolutionResult['provenance']
  readinessFindingCodesResolved: readonly string[]
  acknowledgementRequired: boolean
  acknowledgementBasis?: TaskAssignmentAcknowledgementBasisV1
  changeDecision?: TaskContractChangeDecisionV1
  taxonomyMetadata?: TaskAssignmentTaxonomyMetadataV1 | null
  projectBusinessDomains?: readonly string[]
  previousResolvedContract?: TaskAssignmentSnapshotV1['resolvedContract'] | null
  createdAt: string
  hasher: TaskAssignmentSnapshotHasher
}): BuildTaskAssignmentContractSnapshotResult {
  const acknowledgementBasis: TaskAssignmentAcknowledgementBasisV1 = input.acknowledgementBasis ?? {
    kind: 'fresh_assignment',
    previousSnapshotId: null,
    previousAcknowledgementState: null,
    changeClass: 'initial',
  }
  const changeDecision = input.changeDecision ?? INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1
  const blockers = blockerCodes(input)
  const basisMatchesRequirement =
    acknowledgementBasis.kind === 'acknowledgement_carried_forward'
      ? input.acknowledgementRequired === false
      : input.acknowledgementRequired === true
  if (!basisMatchesRequirement) {
    blockers.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.acknowledgementBasisInvalid)
  }
  const decisionChangeClass = changeDecision.changeClass ?? 'editorial'
  const decisionMatchesBasis =
    acknowledgementBasis.kind === 'fresh_assignment'
      ? changeDecision.changeClass === 'initial'
      : changeDecision.changeClass !== 'initial' &&
        acknowledgementBasis.changeClass === decisionChangeClass &&
        !(
          acknowledgementBasis.kind === 'acknowledgement_carried_forward' &&
          changeDecision.requiresReack
        )
  if (
    !decisionMatchesBasis ||
    !verifyTaskContractChangeDecision({
      decision: changeDecision,
      previous: input.previousResolvedContract ?? null,
      next: input.contract.resolvedContract,
    })
  ) {
    blockers.push(TASK_ASSIGNMENT_SNAPSHOT_BLOCKER_CODES.changeDecisionInvalid)
  }
  if (blockers.length > 0) {
    return {
      allowed: false,
      value: null,
      blockerCodes: [...new Set(blockers)].sort(),
    }
  }

  const { contract } = input
  const resolved = contract.resolvedContract
  const withoutHash: Omit<TaskAssignmentSnapshotV1, 'snapshotHash'> = {
    schemaVersion: 'suar.task_assignment_snapshot.v1',
    id: input.snapshotId,
    assignmentId: input.assignmentId,
    taskId: input.taskId,
    organizationId: input.organizationId,
    projectId: input.projectId as string,
    assigneeId: input.assigneeId,
    assignedBy: input.assignedBy,
    roleInTask: resolved.work.roleInTask,
    ownershipLevel: resolved.work.ownershipLevel,
    resolvedContract: resolved,
    ...(input.projectBusinessDomains === undefined
      ? {}
      : {
          projectBusinessDomains: [
            ...new Set(
              input.projectBusinessDomains
                .map((domain) => domain.trim())
                .filter((domain) => domain.length > 0)
            ),
          ].sort(),
        }),
    ...(input.taxonomyMetadata === undefined
      ? {}
      : { taxonomyMetadata: input.taxonomyMetadata }),
    provenance: {
      projectContextVersionId: resolved.inheritedFrom.projectContextVersionId,
      workPackageVersionId: resolved.inheritedFrom.workPackageVersionId,
      taskSpecificationVersionId: contract.taskSpecificationVersionId,
      taskContractVersionId: contract.id,
      capabilityRubricVersionIds: [
        ...new Set(
          resolved.evidence.capabilities
            .map((item) => item.rubricVersionId)
            .filter((id): id is string => id !== null)
        ),
      ].sort(),
    },
    readinessFindingCodesResolved: [...new Set(input.readinessFindingCodesResolved)].sort(),
    creatorConfirmation: {
      confirmedBy: contract.creatorConfirmedBy as string,
      confirmedAt: contract.creatorConfirmedAt as string,
    },
    acknowledgementRequired: input.acknowledgementRequired,
    createdAt: input.createdAt,
  }
  const snapshot: TaskAssignmentSnapshotV1 = {
    ...withoutHash,
    snapshotHash: input.hasher.hash(
      snapshotHashInput(
        withoutHash,
        input.workFieldProvenance,
        acknowledgementBasis,
        changeDecision
      )
    ),
  }
  return {
    allowed: true,
    blockerCodes: [],
    value: {
      schemaVersion: 'suar.task_assignment_contract_snapshot.v1',
      snapshot,
      workFieldProvenance: input.workFieldProvenance,
      acknowledgementBasis,
      changeDecision,
    },
  }
}
