export type SprintAssignmentEntryReason =
  | 'created_in_backlog'
  | 'planned'
  | 'scope_change'
  | 'carry_over'
  | 'restored'

export type SprintAssignmentExitReason =
  | 'moved_to_backlog'
  | 'moved_to_sprint'
  | 'delivery_completed'
  | 'task_cancelled'
  | 'task_rejected'

export interface ProjectSprintAssignmentHistoryRecord {
  id: string
  organization_id: string
  project_id: string
  task_id: string
  sprint_id: string | null
  entered_at: string
  exited_at: string | null
  entry_reason: SprintAssignmentEntryReason
  exit_reason: SprintAssignmentExitReason | null
  added_after_start: boolean
  actor_id: string | null
  created_at: string
}
