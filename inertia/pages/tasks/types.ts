export type Task = {
  id: number
  title: string
  description?: string
  status_id: number
  status: {
    id: number
    name: string
    color: string
  }
  label_id: number
  label: {
    id: number
    name: string
    color: string
  }
  priority_id: number
  priority: {
    id: number
    name: string
    color: string
    value: number
  }
  assignee?: {
    id: number
    first_name: string
    last_name: string
    full_name: string
    avatar?: string
  }
  assigned_to?: number
  created_by: number
  creator?: {
    id: number
    first_name: string
    last_name: string
    full_name: string
    avatar?: string
  }
  due_date: string
  created_at: string
  updated_at: string
  parent_task_id?: number | null
  parentTask?: {
    id: number
    title: string
    status: {
      id: number
      name: string
      color: string
    }
  } | null
  childTasks?: Task[]
  organization_id?: string | number
  organization?: {
    id: number | string
    name: string
  }
  estimated_time?: number
  actual_time?: number
  [key: string]: any
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
    statuses: Array<{ id: number; name: string; color: string }>
    labels: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    users: Array<{
      id: number
      first_name: string
      last_name: string
      full_name: string
      avatar?: string
    }>
  }
  auth?: {
    user?: {
      id: number
      email: string
      username: string
      first_name: string
      last_name: string
      name?: string
      role?: string
      role_id?: number
      isAdmin?: boolean
      organization_id?: number
      [key: string]: any
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
  completedStatusId?: number
  pendingStatusId?: number
  onToggleStatus: (task: Task, newStatusId: number) => void
  formatDate: (dateString: string) => string
  statuses?: Array<{ id: number; name: string; color: string }>
  priorities?: Array<{ id: number; name: string; color: string; value: number }>
  labels?: Array<{ id: number; name: string; color: string }>
  users?: Array<{
    id: number
    first_name: string
    last_name: string
    full_name: string
    avatar?: string
  }>
  currentUser?: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
}
