export interface TaskStatusMirrorSource {
  category: string
}

/**
 * `task_status_id` is the source of truth. The legacy `tasks.status` column stores
 * the status category only for older reporting and UI paths that still read it.
 */
export function toLegacyTaskStatusMirror(status: TaskStatusMirrorSource): string {
  return status.category
}
