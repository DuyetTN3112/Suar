export type SprintStatus = 'draft' | 'active' | 'review_open' | 'review_closed' | 'archived'

export interface ProjectSprint {
  id: string
  name: string
  goal: string | null
  status: SprintStatus
  startsAt: string
  endsAt: string
  reviewOpenedAt: string | null
  reviewClosedAt: string | null
  reverseReviewPendingCount?: number | string
  reverseReviewAssignerPendingCount?: number | string
  reverseReviewEnvironmentPendingCount?: number | string
}

export interface SprintBoardTask {
  id: string
  title: string
  status: string
  priority: string
  assignedTo: string | null
  projectSprintId: string | null
  sortOrder: number
  updatedAt: string
  addedAfterStart?: boolean
}

export interface SprintBoard {
  projectId: string
  sprint: {
    id: string
    name: string
    goal: string | null
    status: SprintStatus
    startsAt: string
    endsAt: string
  } | null
  backlogTasks: SprintBoardTask[]
  sprintTasks: SprintBoardTask[]
  counts: {
    backlogTasks: number
    sprintTasks: number
  }
}

export interface TaskHistoryEntry {
  id: string
  sprintId: string | null
  entryReason: string
  exitReason: string | null
  current: boolean
}

export const statusFallbacks: Record<SprintStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  review_open: 'In review',
  review_closed: 'Review closed',
  archived: 'Archived',
}
