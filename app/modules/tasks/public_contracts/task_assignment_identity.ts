import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

export interface TaskAssignmentIdentityHasher {
  hash(value: unknown): TvaSha256
}

export const TASK_ASSIGNMENT_IDENTITY_V1 = 'suar.task_assignment_identity.v1' as const

/** Stable identity shared by all successor contract snapshots for one assignment. */
export function taskAssignmentIdentityHashInput(snapshot: TaskAssignmentSnapshotV1) {
  return {
    schemaVersion: TASK_ASSIGNMENT_IDENTITY_V1,
    assignmentId: snapshot.assignmentId,
    taskId: snapshot.taskId,
    organizationId: snapshot.organizationId,
    projectId: snapshot.projectId,
    assigneeId: snapshot.assigneeId,
    assignedBy: snapshot.assignedBy,
  }
}

export function hashTaskAssignmentIdentity(
  snapshot: TaskAssignmentSnapshotV1,
  hasher: TaskAssignmentIdentityHasher
): TvaSha256 {
  return hasher.hash(taskAssignmentIdentityHashInput(snapshot))
}
