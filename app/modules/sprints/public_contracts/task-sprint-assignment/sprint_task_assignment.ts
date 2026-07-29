export interface SprintTaskAssignmentRecord {
  id: string
  project_id: string | null
  project_sprint_id: string | null
  updated_at: string | Date | null
}

export interface MoveTaskToSprintDTO {
  project_id: string
  task_id: string
  project_sprint_id: string | null
  reason?: 'planned' | 'scope_change' | 'carry_over' | 'restored'
}
