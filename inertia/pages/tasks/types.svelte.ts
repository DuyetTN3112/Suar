export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'in_review'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'documentation'
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  label: TaskLabel
  priority: TaskPriority
  difficulty?: TaskDifficulty | null
  assignee?: {
    id: string
    username: string
    email: string
  }
  assigned_to?: string | null
  creator_id: string
  creator?: {
    id: string
    username: string
    email: string
  }
  due_date: string | null
  created_at: string
  updated_at: string
  parent_task_id?: string | null
  parentTask?: {
    id: string
    title: string
    status: string
  } | null
  childTasks?: Task[]
  organization_id: string
  organization?: {
    id: string
    name: string
  }
  project_id?: string | null
  estimated_time?: number
  actual_time?: number
  task_visibility?: 'internal' | 'external' | 'all'
  application_deadline?: string | null
  estimated_budget?: number | null
  sort_order?: number
  [key: string]: unknown
}

export type TasksProps = {
  tasks: {
    data: Task[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }
  filters: {
    status?: string
    priority?: string
    label?: string
    search?: string
    assigned_to?: string
  }
  metadata: {
    statuses: Array<{ value: string; label: string; color: string }>
    labels: Array<{ value: string; label: string; color: string }>
    priorities: Array<{ value: string; label: string; color: string }>
    users: Array<{
      id: string
      username: string
      email: string
    }>
  }
  auth?: {
    user?: {
      id: string
      email: string
      username: string
      role?: string
      isAdmin?: boolean
      organization_id?: string
      [key: string]: unknown
    }
  }
}

export type TaskFilterProps = {
  filters: TasksProps['filters']
  metadata: TasksProps['metadata']
  onSearch: (query: string) => void
  onStatusChange: (status: string) => void
  onPriorityChange: (priority: string) => void
  onTabChange: (tab: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedStatus: string
  selectedPriority: string
  activeTab: string
}

export type TaskItemProps = {
  task: Task
  onToggleStatus: (task: Task, newStatus: string) => void
  formatDate: (dateString: string) => string
  statuses?: Array<{ value: string; label: string; color: string }>
  priorities?: Array<{ value: string; label: string; color: string }>
  labels?: Array<{ value: string; label: string; color: string }>
  users?: Array<{
    id: string
    username: string
    email: string
  }>
  currentUser?: {
    id?: string
    role?: string
    organization_id?: string
  }
}
