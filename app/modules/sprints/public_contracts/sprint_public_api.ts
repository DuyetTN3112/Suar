import type { CanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export type {
  MoveTaskToSprintDTO,
  SprintTaskAssignmentRecord,
} from '#modules/sprints/public_contracts/task-sprint-assignment/sprint_task_assignment'

export type ProjectSprintCoreStatus =
  | 'draft'
  | 'active'
  | 'review_open'
  | 'review_closed'
  | 'archived'

export interface ProjectSprintRecord {
  id: string
  organization_id: string
  project_id: string
  name: string
  goal: string | null
  status: ProjectSprintCoreStatus
  starts_at: string
  ends_at: string
  created_by: string
  closed_by: string | null
  review_opened_at: string | null
  review_closed_at: string | null
  reverse_review_pending_count?: number | string
  reverse_review_assigner_pending_count?: number | string
  reverse_review_environment_pending_count?: number | string
  created_at: string
  updated_at: string
}

export interface CreateProjectSprintDTO {
  project_id: string
  name: string
  goal?: string | null
  starts_at: string
  ends_at: string
  status?: ProjectSprintCoreStatus
}

export interface UpdateProjectSprintDTO {
  project_id: string
  sprint_id: string
  name?: string
  goal?: string | null
  starts_at?: string
  ends_at?: string
  status?: ProjectSprintCoreStatus
}

export interface EndProjectSprintDeliveryDTO {
  project_id: string
  sprint_id: string
  incomplete_tasks: Array<{
    task_id: string
    destination: { kind: 'backlog' } | { kind: 'sprint'; sprint_id: string }
  }>
}

export interface SprintBoardSprint {
  id: string
  name: string
  goal: string | null
  status: string
  starts_at: string
  ends_at: string
}

export interface SprintBoardTask {
  id: string
  title: string
  task_status_id: string | null
  status: string
  priority: string
  assigned_to: string | null
  project_sprint_id: string | null
  sort_order: number
  updated_at: string
  added_after_start?: boolean
}

export interface GetSprintBoardDTO {
  project_id: string
  project_sprint_id?: string | null
}

export interface GetProjectBacklogDTO {
  project_id: string
  page?: unknown
  per_page?: unknown
  status?: string[]
}

export interface ReorderProjectBacklogDTO {
  project_id: string
  task_id: string
  before_task_id?: string | null
  after_task_id?: string | null
}

export interface ProjectBacklogResult {
  project_id: string
  tasks: SprintBoardTask[]
  counts: { total: number }
  pagination: CanonicalPagePagination
}

export interface SprintBoardResult {
  project_id: string
  sprint: SprintBoardSprint | null
  backlog_tasks: SprintBoardTask[]
  sprint_tasks: SprintBoardTask[]
  counts: {
    backlog_tasks: number
    sprint_tasks: number
  }
}

export interface ListProjectSprintsDTO {
  projectId: string
  page?: unknown
  perPage?: unknown
}

export interface ListProjectSprintsResult {
  data: ProjectSprintRecord[]
  pagination: CanonicalPagePagination
}
