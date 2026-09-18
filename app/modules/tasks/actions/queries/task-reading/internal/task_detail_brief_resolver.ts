import type { TaskResolvedBriefAssignmentAccess } from './task_detail_authorizer.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { buildTaskResolvedBriefCacheKey } from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_cache_key'
import {
  projectMissingAssignmentSnapshotBrief,
  projectStaleAssignmentAccessBrief,
  projectTaskAssignmentResolvedBrief,
  projectTaskResolvedBrief,
  type TaskResolvedBriefAudience,
  type TaskResolvedBriefProjectionV1,
} from '#modules/tasks/actions/queries/task-reading/internal/task_resolved_brief_projection'

export async function resolveTaskDetailBrief(
  organizationId: string,
  taskId: string,
  actorId: string,
  audience: TaskResolvedBriefAudience,
  assignmentAccess: TaskResolvedBriefAssignmentAccess | null,
  deps: TaskExternalDependencies
): Promise<TaskResolvedBriefProjectionV1> {
  const actorAssignment =
    audience === 'work_participant' && assignmentAccess
      ? await deps.activeAssignmentReader?.findActorAssignment(
          taskId,
          actorId
        )
      : null
  const assignmentAccessIsCurrent =
    assignmentAccess !== null &&
    actorAssignment?.id === assignmentAccess.id &&
    actorAssignment.assigneeId === actorId &&
    actorAssignment.status === assignmentAccess.status
  const assignmentSnapshot =
    assignmentAccessIsCurrent && deps.assignmentContract
      ? await deps.assignmentContract.repository.findCurrent(
          assignmentAccess.id
        )
      : null
  const snapshotMatchesActor =
    assignmentSnapshot !== null &&
    assignmentAccess !== null &&
    assignmentSnapshot.assignmentId === assignmentAccess.id &&
    assignmentSnapshot.envelope.snapshot.assigneeId === actorId

  if (audience === 'work_participant' && assignmentAccess) {
    const cacheKey = buildTaskResolvedBriefCacheKey({
      organizationId,
      taskId,
      audience,
      bundle: null,
      assignmentSnapshot: snapshotMatchesActor ? assignmentSnapshot : null,
      assignmentAccessId: assignmentAccess.id,
    })
    const cached = await cacheStore.get<TaskResolvedBriefProjectionV1>(cacheKey)
    if (cached) return cached

    const projection =
      !assignmentAccessIsCurrent
        ? projectStaleAssignmentAccessBrief(audience)
        : assignmentSnapshot && snapshotMatchesActor
          ? projectTaskAssignmentResolvedBrief(assignmentSnapshot, audience)
          : projectMissingAssignmentSnapshotBrief(audience)
    await cacheStore.setBestEffort(cacheKey, projection, 300)
    return projection
  }

  const reader = deps.resolvedBrief
  if (!reader) {
    throw new DependencyUnavailableException('task_resolved_brief_reader', 'read_current_bundle')
  }
  const bundle = await reader.readCurrentBundle(taskId)
  const cacheKey = buildTaskResolvedBriefCacheKey({
    organizationId,
    taskId,
    audience,
    bundle,
    assignmentSnapshot: snapshotMatchesActor ? assignmentSnapshot : null,
  })
  const cached = await cacheStore.get<TaskResolvedBriefProjectionV1>(cacheKey)
  if (cached) return cached

  const projection = projectTaskResolvedBrief(bundle, audience)
  await cacheStore.setBestEffort(cacheKey, projection, 300)
  return projection
}
