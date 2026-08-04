import type { TaskAssignmentContractSnapshotRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { CurrentTaskAuthoringBundle } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import type { TaskResolvedBriefAudience } from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type {
  ResolvedTaskContractV1,
  TaskReadinessResultV1,
  TaskSpecificationVersionV1,
  TaskSupportingReferenceV1,
} from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export type { TaskResolvedBriefAudience } from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'

export interface TaskResolvedBriefAuthoringSourceV1 {
  readonly specification: TaskSpecificationVersionV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly readiness: TaskReadinessResultV1
}

export interface TaskResolvedBriefChangeSummaryV1 {
  readonly changeClass: TaskAssignmentContractSnapshotRecord['envelope']['changeDecision']['changeClass']
  readonly changedPaths: readonly string[]
  readonly requiresReack: boolean
  readonly isSuccessor: boolean
}

export interface TaskResolvedBriefProjectionV1 {
  readonly schemaVersion: 'suar.task_resolved_brief_projection.v1'
  readonly state: 'legacy' | 'draft' | 'published' | 'restricted'
  readonly audience: TaskResolvedBriefAudience
  readonly resolutionSource: 'legacy' | 'current_authoring' | 'assignment_snapshot' | 'restricted'
  readonly assignmentSnapshotId: string | null
  readonly assignmentSnapshotHash: TvaSha256 | null
  readonly assignmentId: string | null
  readonly acknowledgementRequired: boolean
  readonly acknowledgementState: TaskAssignmentContractSnapshotRecord['acknowledgementState'] | null
  readonly headRevision: number | null
  readonly specificationVersionId: string | null
  readonly contractVersionId: string | null
  readonly resolvedContentHash: TvaSha256 | null
  readonly resolvedContract: ResolvedTaskContractV1 | null
  readonly changeSummary: TaskResolvedBriefChangeSummaryV1 | null
  readonly workFieldProvenance: TaskWorkContractResolutionResult['provenance'] | null
  readonly authoring: TaskResolvedBriefAuthoringSourceV1 | null
  readonly restrictionCode:
    | 'TASK_BRIEF_LEGACY_UNVERSIONED'
    | 'TASK_BRIEF_NOT_PUBLISHED'
    | 'TASK_BRIEF_PUBLIC_PROJECTION_UNAVAILABLE'
    | 'TASK_BRIEF_ASSIGNMENT_SNAPSHOT_MISSING'
    | 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE'
    | null
}

function restrictedPublicProjection(
  audience: TaskResolvedBriefAudience
): TaskResolvedBriefProjectionV1 {
  return {
    schemaVersion: 'suar.task_resolved_brief_projection.v1',
    state: 'restricted',
    audience,
    resolutionSource: 'restricted',
    assignmentSnapshotId: null,
    assignmentSnapshotHash: null,
    assignmentId: null,
    acknowledgementRequired: false,
    acknowledgementState: null,
    headRevision: null,
    specificationVersionId: null,
    contractVersionId: null,
    resolvedContentHash: null,
    resolvedContract: null,
    changeSummary: null,
    workFieldProvenance: null,
    authoring: null,
    restrictionCode: 'TASK_BRIEF_PUBLIC_PROJECTION_UNAVAILABLE',
  }
}

export function projectTaskResolvedBrief(
  bundle: CurrentTaskAuthoringBundle | null,
  audience: TaskResolvedBriefAudience
): TaskResolvedBriefProjectionV1 {
  if (!bundle) {
    return {
      schemaVersion: 'suar.task_resolved_brief_projection.v1',
      state: 'legacy',
      audience,
      resolutionSource: 'legacy',
      assignmentSnapshotId: null,
      assignmentSnapshotHash: null,
      assignmentId: null,
      acknowledgementRequired: false,
      acknowledgementState: null,
      headRevision: null,
      specificationVersionId: null,
      contractVersionId: null,
      resolvedContentHash: null,
      resolvedContract: null,
      changeSummary: null,
      workFieldProvenance: null,
      authoring: null,
      restrictionCode: 'TASK_BRIEF_LEGACY_UNVERSIONED',
    }
  }

  if (audience === 'public_preview') {
    return restrictedPublicProjection(audience)
  }

  const creatorAuthoring =
    audience === 'creator_edit'
      ? {
          specification: bundle.specification,
          supportingReferences: bundle.supportingReferences,
          readiness: bundle.readiness,
        }
      : null

  if (!bundle.contract) {
    const canInspectDraft = audience === 'creator_edit'
    return {
      schemaVersion: 'suar.task_resolved_brief_projection.v1',
      state: 'draft',
      audience,
      resolutionSource: 'current_authoring',
      assignmentSnapshotId: null,
      assignmentSnapshotHash: null,
      assignmentId: null,
      acknowledgementRequired: false,
      acknowledgementState: null,
      headRevision: canInspectDraft ? bundle.headRevision : null,
      specificationVersionId: canInspectDraft ? bundle.specification.id : null,
      contractVersionId: null,
      resolvedContentHash: null,
      resolvedContract: null,
      changeSummary: null,
      workFieldProvenance: null,
      authoring: creatorAuthoring,
      restrictionCode: audience === 'creator_edit' ? null : 'TASK_BRIEF_NOT_PUBLISHED',
    }
  }

  return {
    schemaVersion: 'suar.task_resolved_brief_projection.v1',
    state: 'published',
    audience,
    resolutionSource: 'current_authoring',
    assignmentSnapshotId: null,
    assignmentSnapshotHash: null,
    assignmentId: null,
    acknowledgementRequired: false,
    acknowledgementState: null,
    headRevision: bundle.headRevision,
    specificationVersionId: bundle.specification.id,
    contractVersionId: bundle.contract.id,
    resolvedContentHash: bundle.contract.resolvedContract.resolvedContentHash,
    resolvedContract: bundle.contract.resolvedContract,
    changeSummary: null,
    workFieldProvenance: bundle.workFieldProvenance,
    authoring: creatorAuthoring,
    restrictionCode: null,
  }
}

export function projectTaskAssignmentResolvedBrief(
  snapshot: TaskAssignmentContractSnapshotRecord,
  audience: TaskResolvedBriefAudience
): TaskResolvedBriefProjectionV1 {
  if (audience === 'public_preview') return restrictedPublicProjection(audience)
  const canonical = snapshot.envelope.snapshot
  return {
    schemaVersion: 'suar.task_resolved_brief_projection.v1',
    state: 'published',
    audience,
    resolutionSource: 'assignment_snapshot',
    assignmentSnapshotId: snapshot.id,
    assignmentSnapshotHash: snapshot.snapshotHash,
    assignmentId: snapshot.assignmentId,
    acknowledgementRequired: snapshot.acknowledgementRequired,
    acknowledgementState: snapshot.acknowledgementState,
    headRevision: snapshot.sequence,
    specificationVersionId: canonical.provenance.taskSpecificationVersionId,
    contractVersionId: canonical.provenance.taskContractVersionId,
    resolvedContentHash: canonical.resolvedContract.resolvedContentHash,
    resolvedContract: canonical.resolvedContract,
    changeSummary: {
      changeClass: snapshot.envelope.changeDecision.changeClass,
      changedPaths: snapshot.envelope.changeDecision.changedPaths,
      requiresReack: snapshot.envelope.changeDecision.requiresReack,
      isSuccessor: snapshot.envelope.acknowledgementBasis.kind === 'reacknowledgement_required',
    },
    workFieldProvenance: snapshot.envelope.workFieldProvenance,
    authoring: null,
    restrictionCode: null,
  }
}

export function projectMissingAssignmentSnapshotBrief(
  audience: TaskResolvedBriefAudience
): TaskResolvedBriefProjectionV1 {
  return {
    ...restrictedPublicProjection(audience),
    restrictionCode: 'TASK_BRIEF_ASSIGNMENT_SNAPSHOT_MISSING',
  }
}

export function projectStaleAssignmentAccessBrief(
  audience: TaskResolvedBriefAudience
): TaskResolvedBriefProjectionV1 {
  return {
    ...restrictedPublicProjection(audience),
    restrictionCode: 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE',
  }
}
