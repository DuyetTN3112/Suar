/**
 * TaskEntity — Pure Domain Entity
 *
 * Represents a Task in the business domain.
 * 100% pure TypeScript, NO framework dependencies.
 * All business logic related to task state lives here.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'in_review'
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'documentation'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type TaskVisibility = 'internal' | 'external' | 'all'

export interface TaskEntityProps {
  id: string
  title: string
  description: string
  status: TaskStatus
  taskStatusId: string | null
  label: TaskLabel
  priority: TaskPriority
  difficulty: TaskDifficulty | null
  assignedTo: string | null
  creatorId: string
  updatedBy: string | null
  dueDate: Date | null
  parentTaskId: string | null
  estimatedTime: number
  actualTime: number
  organizationId: string
  projectId: string | null
  taskVisibility: TaskVisibility
  applicationDeadline: Date | null
  estimatedBudget: number | null
  externalApplicationsCount: number
  sortOrder: number
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class TaskEntity {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly status: TaskStatus
  readonly taskStatusId: string | null
  readonly label: TaskLabel
  readonly priority: TaskPriority
  readonly difficulty: TaskDifficulty | null
  readonly assignedTo: string | null
  readonly creatorId: string
  readonly updatedBy: string | null
  readonly dueDate: Date | null
  readonly parentTaskId: string | null
  readonly estimatedTime: number
  readonly actualTime: number
  readonly organizationId: string
  readonly projectId: string | null
  readonly taskVisibility: TaskVisibility
  readonly applicationDeadline: Date | null
  readonly estimatedBudget: number | null
  readonly externalApplicationsCount: number
  readonly sortOrder: number
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: TaskEntityProps) {
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
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  get isOverdue(): boolean {
    if (!this.dueDate) return false
    return this.dueDate < new Date() && this.status !== 'done' && this.status !== 'cancelled'
  }

  get isAssigned(): boolean {
    return this.assignedTo !== null
  }

  get isSubtask(): boolean {
    return this.parentTaskId !== null
  }

  get isCompleted(): boolean {
    return this.status === 'done'
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled'
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null
  }

  get isExternal(): boolean {
    return this.taskVisibility === 'external' || this.taskVisibility === 'all'
  }

  get belongsToProject(): boolean {
    return this.projectId !== null
  }

  get hasEstimatedBudget(): boolean {
    return this.estimatedBudget !== null && this.estimatedBudget > 0
  }

  get isApplicationOpen(): boolean {
    if (!this.isExternal) return false
    if (!this.applicationDeadline) return true
    return this.applicationDeadline > new Date()
  }

  get timeEfficiency(): number | null {
    if (this.estimatedTime <= 0 || this.actualTime <= 0) return null
    return this.estimatedTime / this.actualTime
  }
}
