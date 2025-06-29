export type TaskStatus = string
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'documentation'
export type TaskDifficulty = string

export type TaskRequiredSkill = {
  id: string
  skill_id?: string
  min_level_code?: string
  level?: string
  skill?: {
    id: string
    skill_name: string
    skill_code?: string
  }
}

export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  task_status_id?: string | null
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
    task_status_id?: string | null
  } | null
  childTasks?: Task[]
  organization_id: string
  organization?: {
    id: string
    name: string
  }
  project_id: string
  project?: {
    id: string
    name: string
  }
  estimated_time?: number
  actual_time?: number
  task_visibility?: 'internal' | 'external' | 'all'
  application_deadline?: string | null
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  context_background?: string | null
  tech_stack?: string[]
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string | null
  collaboration_type?: string | null
  autonomy_level?: string | null
  required_skills_rel?: TaskRequiredSkill[]
  estimated_budget?: number | null
  sort_order?: number
  [key: string]: unknown
}

export type TaskMetadata = {
  statuses: Array<{
    value: string
    label: string
    color?: string
    slug?: string
    category?: string
  }>
  labels: Array<{ value: string; label: string; color?: string }>
  priorities: Array<{ value: string; label: string; color?: string }>
  users: Array<{
    id: string
    username: string
    email: string
  }>
  parentTasks?: Array<{
    id: string
    title: string
    task_status_id: string | null
  }>
  availableSkills?: Array<{
    id: string
    name: string
  }>
  projects?: Array<{
    id: string
    name: string
  }>
}

export type TasksProps = {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
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
    task_status_id?: string
    status?: string
    priority?: string
    label?: string
    search?: string
    assigned_to?: string
    project_id?: string
  }
  metadata: TaskMetadata
  projectOptions?: Array<{ id: string; name: string }>
  projectContext?: {
    selectedProject: { id: string; name: string } | null
  }
  permissions?: {
    canCreateTask: boolean
    createTaskReason?: string | null
  }
  auth?: {
    user?: {
      id: string
      email: string
      username: string
      role?: string
      isAdmin?: boolean
      organization_id?: string
      current_organization_role?: string | null
      [key: string]: unknown
    }
  }
}

export type TaskFilterProps = {
  filters: TasksProps['filters']
  metadata: TaskMetadata
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
  completedStatus?: string
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
