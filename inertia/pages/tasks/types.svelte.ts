export type Task = {
  id: string
  title: string
  description?: string
  status: string
  label: string
  priority: string
  difficulty?: string | null
  assignee?: {
    id: string
    username: string
    email: string
  }
  assigned_to?: string
  created_by: string
  creator?: {
    id: string
    username: string
    email: string
  }
  due_date: string
  created_at: string
  updated_at: string
  parent_task_id?: string | null
  parentTask?: {
    id: string
    title: string
    status: string
  } | null
  childTasks?: Task[]
  organization_id?: string
  organization?: {
    id: string
    name: string
  }
  estimated_time?: number
  actual_time?: number
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
