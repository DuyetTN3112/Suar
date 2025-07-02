/**
 * Task Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

export interface TaskDetailResponseDTOProps {
  id: string
  title: string
  description: string
  status: string
  taskStatusId: string | null
  label: string
  priority: string
  difficulty: string | null
  assignedTo: string | null
  creatorId: string
  updatedBy: string | null
  dueDate: Date | null
  parentTaskId: string | null
  estimatedTime: number
  actualTime: number
  organizationId: string
  projectId: string | null
  taskVisibility: string
  applicationDeadline: Date | null
  estimatedBudget: number | null
  externalApplicationsCount: number
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface TaskListItemResponseDTOProps {
  id: string
  title: string
  status: string
  label: string
  priority: string
  difficulty: string | null
  assignedTo: string | null
  dueDate: Date | null
  organizationId: string
  projectId: string | null
  sortOrder: number
  createdAt: Date
}

export interface TaskSummaryResponseDTOProps {
  id: string
  title: string
  status: string
  priority: string
}

/**
 * TaskDetailResponseDTO — Full task detail for detail views
 */
export class TaskDetailResponseDTO {
  public readonly id: string
  public readonly title: string
  public readonly description: string
  public readonly status: string
  public readonly taskStatusId: string | null
  public readonly label: string
  public readonly priority: string
  public readonly difficulty: string | null
  public readonly assignedTo: string | null
  public readonly creatorId: string
  public readonly updatedBy: string | null
  public readonly dueDate: Date | null
  public readonly parentTaskId: string | null
  public readonly estimatedTime: number
  public readonly actualTime: number
  public readonly organizationId: string
  public readonly projectId: string | null
  public readonly taskVisibility: string
  public readonly applicationDeadline: Date | null
  public readonly estimatedBudget: number | null
  public readonly externalApplicationsCount: number
  public readonly sortOrder: number
  public readonly createdAt: Date
  public readonly updatedAt: Date

  constructor(props: TaskDetailResponseDTOProps) {
    this.id = props.id
    this.title = props.title
    this.description = props.description
    this.status = props.status
    this.taskStatusId = props.taskStatusId
    this.label = props.label
    this.priority = props.priority
    this.difficulty = props.difficulty
    this.assignedTo = props.assignedTo
    this.creatorId = props.creatorId
    this.updatedBy = props.updatedBy
    this.dueDate = props.dueDate
    this.parentTaskId = props.parentTaskId
    this.estimatedTime = props.estimatedTime
    this.actualTime = props.actualTime
    this.organizationId = props.organizationId
    this.projectId = props.projectId
    this.taskVisibility = props.taskVisibility
    this.applicationDeadline = props.applicationDeadline
    this.estimatedBudget = props.estimatedBudget
    this.externalApplicationsCount = props.externalApplicationsCount
    this.sortOrder = props.sortOrder
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }
}

/**
 * TaskListItemResponseDTO — Compact task info for list views
 */
export class TaskListItemResponseDTO {
  public readonly id: string
  public readonly title: string
  public readonly status: string
  public readonly label: string
  public readonly priority: string
  public readonly difficulty: string | null
  public readonly assignedTo: string | null
  public readonly dueDate: Date | null
  public readonly organizationId: string
  public readonly projectId: string | null
  public readonly sortOrder: number
  public readonly createdAt: Date

  constructor(props: TaskListItemResponseDTOProps) {
    this.id = props.id
    this.title = props.title
    this.status = props.status
    this.label = props.label
    this.priority = props.priority
    this.difficulty = props.difficulty
    this.assignedTo = props.assignedTo
    this.dueDate = props.dueDate
    this.organizationId = props.organizationId
    this.projectId = props.projectId
    this.sortOrder = props.sortOrder
    this.createdAt = props.createdAt
  }
}

/**
 * TaskSummaryResponseDTO — Minimal task info (for references in other entities)
 */
export class TaskSummaryResponseDTO {
  public readonly id: string
  public readonly title: string
  public readonly status: string
  public readonly priority: string

  constructor(props: TaskSummaryResponseDTOProps) {
    this.id = props.id
    this.title = props.title
    this.status = props.status
    this.priority = props.priority
  }
}
