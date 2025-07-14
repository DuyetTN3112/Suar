/**
 * Task Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

import type { TaskEntity } from '#domain/tasks/entities/task_entity'

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

type TaskSharedResponseProps = Pick<
  TaskListItemResponseDTOProps,
  | 'id'
  | 'title'
  | 'status'
  | 'label'
  | 'priority'
  | 'difficulty'
  | 'assignedTo'
  | 'dueDate'
  | 'organizationId'
  | 'projectId'
  | 'sortOrder'
  | 'createdAt'
>

function createTaskSharedResponseProps(entity: TaskEntity): TaskSharedResponseProps {
  return {
    id: entity.id,
    title: entity.title,
    status: entity.status,
    label: entity.label,
    priority: entity.priority,
    difficulty: entity.difficulty,
    assignedTo: entity.assignedTo,
    dueDate: entity.dueDate,
    organizationId: entity.organizationId,
    projectId: entity.projectId,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
  }
}

function createTaskDetailResponseProps(entity: TaskEntity): TaskDetailResponseDTOProps {
  const shared = createTaskSharedResponseProps(entity)

  return {
    ...shared,
    description: entity.description,
    taskStatusId: entity.taskStatusId,
    creatorId: entity.creatorId,
    updatedBy: entity.updatedBy,
    parentTaskId: entity.parentTaskId,
    estimatedTime: entity.estimatedTime,
    actualTime: entity.actualTime,
    taskVisibility: entity.taskVisibility,
    applicationDeadline: entity.applicationDeadline,
    estimatedBudget: entity.estimatedBudget,
    externalApplicationsCount: entity.externalApplicationsCount,
    updatedAt: entity.updatedAt,
  }
}

function createTaskSummaryResponseProps(entity: TaskEntity): TaskSummaryResponseDTOProps {
  return {
    id: entity.id,
    title: entity.title,
    status: entity.status,
    priority: entity.priority,
  }
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

  private constructor(props: TaskDetailResponseDTOProps) {
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

  static fromProps(props: TaskDetailResponseDTOProps): TaskDetailResponseDTO {
    return new TaskDetailResponseDTO(props)
  }

  static fromEntity(entity: TaskEntity): TaskDetailResponseDTO {
    return new TaskDetailResponseDTO(createTaskDetailResponseProps(entity))
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

  private constructor(props: TaskListItemResponseDTOProps) {
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

  static fromProps(props: TaskListItemResponseDTOProps): TaskListItemResponseDTO {
    return new TaskListItemResponseDTO(props)
  }

  static fromEntity(entity: TaskEntity): TaskListItemResponseDTO {
    return new TaskListItemResponseDTO(createTaskSharedResponseProps(entity))
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

  private constructor(props: TaskSummaryResponseDTOProps) {
    this.id = props.id
    this.title = props.title
    this.status = props.status
    this.priority = props.priority
  }

  static fromProps(props: TaskSummaryResponseDTOProps): TaskSummaryResponseDTO {
    return new TaskSummaryResponseDTO(props)
  }

  static fromEntity(entity: TaskEntity): TaskSummaryResponseDTO {
    return new TaskSummaryResponseDTO(createTaskSummaryResponseProps(entity))
  }
}
