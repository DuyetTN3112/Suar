import { TaskStatus, TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

export interface TaskStatusMirrorSource {
  category: string
}

/**
 * `task_status_id` is the source of truth. The legacy `tasks.status` column stores
 * the status category only for older reporting and UI paths that still read it.
 */
export function toLegacyTaskStatusMirror(status: TaskStatusMirrorSource): string {
  // `tasks.status` predates the Docs role and remains constrained to work
  // lifecycle values. `task_status_id` is authoritative for Docs; mirroring it
  // as TODO protects legacy readers without allowing the item into work flow.
  return status.category === TaskStatusCategory.DOCS ? TaskStatus.TODO : status.category
}
