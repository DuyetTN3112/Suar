import type { TaskAssignmentContractSnapshotRecord } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { CurrentTaskAuthoringBundle } from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { TaskResolvedBriefAudience } from '#modules/tasks/domain/task-authoring/task_resolved_brief_access_policy'

const CACHE_SCHEMA_VERSION = 'v1'

function immutableVersionToken(
  bundle: CurrentTaskAuthoringBundle | null,
  assignmentSnapshot?: TaskAssignmentContractSnapshotRecord | null,
  assignmentAccessId?: string | null
): string {
  if (assignmentSnapshot) {
    return `assignment:${assignmentSnapshot.id}:${assignmentSnapshot.snapshotHash.replace('sha256:', '')}:${assignmentSnapshot.acknowledgementState}`
  }
  const authoringToken = (() => {
    if (!bundle) return 'legacy'
    if (bundle.contract) {
      return bundle.contract.resolvedContract.resolvedContentHash.replace('sha256:', '')
    }

    return [
      'draft',
      bundle.headRevision,
      bundle.specification.id,
      bundle.specification.contentHash.replace('sha256:', ''),
    ].join(':')
  })()
  if (assignmentAccessId) return `assignment:${assignmentAccessId}:missing:${authoringToken}`
  return authoringToken
}

export function buildTaskResolvedBriefCacheKey(input: {
  organizationId: string
  taskId: string
  audience: TaskResolvedBriefAudience
  bundle: CurrentTaskAuthoringBundle | null
  assignmentSnapshot?: TaskAssignmentContractSnapshotRecord | null
  assignmentAccessId?: string | null
}): string {
  return [
    'task',
    'resolved-brief',
    CACHE_SCHEMA_VERSION,
    'org',
    input.organizationId,
    'task',
    input.taskId,
    'scope',
    input.audience,
    'version',
    immutableVersionToken(input.bundle, input.assignmentSnapshot, input.assignmentAccessId),
  ].join(':')
}
