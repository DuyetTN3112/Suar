import type {
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskDifficulty,
} from '@/apps/user/modules/tasks/types/index.svelte'

export type TaskLayout = 'kanban' | 'list'

export interface TaskFilters {
  search: string
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  labels: TaskLabel[]
  difficulties: TaskDifficulty[]
  assignees: string[]
}

export interface TaskDisplayProperties {
  status: boolean
  priority: boolean
  label: boolean
  assignee: boolean
  dueDate: boolean
  createdAt: boolean
  difficulty: boolean
  estimatedTime: boolean
  progress: boolean
  project: boolean
}

export interface TaskSortConfig {
  field: 'title' | 'due_date' | 'created_at' | 'updated_at' | 'priority' | 'status' | 'sort_order'
  order: 'asc' | 'desc'
}

export interface TaskScopeSnapshot {
  baseRoute: string
  shellMode?: 'app' | 'organization' | 'project'
  projectId?: string | null
}

export interface TaskStoreOptions {
  getCurrentScope?: () => TaskScopeSnapshot
}

export interface TaskMutationNormalizedError {
  message: string
  isConflict: boolean
}

export interface TaskStoreNotificationService {
  info: (title: string, message: string) => void
  error: (title: string, message: string) => void
}

export type TaskTranslationFn = (
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
) => string

export interface TaskStoreDependencies {
  normalizeTaskMutationError: (
    error: unknown,
    fallback?: string
  ) => TaskMutationNormalizedError
  notificationStore: TaskStoreNotificationService
  translate: TaskTranslationFn
  options?: TaskStoreOptions
}
