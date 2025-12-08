export type TaskStatus = string
export type TaskStatusCategory = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskLabel = 'bug' | 'feature' | 'enhancement' | 'documentation'
export type TaskDifficulty = string

export interface TaskStatusCreateInput {
  name: string
  slug: string
  group: TaskStatusCategory
  color?: string
  description?: string
  sortOrder: number
}

export interface TaskRequiredSkill {
  id: string
  skill_id?: string
  required_public_proficiency_code?: string
  level?: string
  skill?: {
    id: string
    skill_name: string
    skill_code?: string
  }
}

export interface TaskReviewZoneSummary {
  submission_id: string | null
  submission_status: string | null
  review_session_id: string | null
  review_session_status: string | null
  dispute_id: string | null
  dispute_status: string | null
  creator_review_completed: boolean | null
  manager_reviews_count: number
  peer_reviews_count: number
  required_total_reviews: number | null
  required_peer_reviews: number | null
  required_pending_assignments: number
  optional_pending_assignments: number
}

export interface TaskDetail {
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
  childTasks?: TaskDetail[]
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
  environment?: string | null
  complexity_notes?: string | null
  problem_category?: string | null
  business_domain?: string | null
  review_zone?: TaskReviewZoneSummary | null
  estimated_users_affected?: number | null
  required_skills_rel?: TaskRequiredSkill[]
  sort_order?: number
  [key: string]: unknown
}

export interface TaskMetadata {
  statuses: {
    id?: string
    value: string
    label: string
    color?: string
    slug?: string
    category?: string
    is_system?: boolean
  }[]
  labels: { value: string; label: string; color?: string }[]
  priorities: { value: string; label: string; color?: string }[]
  users: { id: string; username: string; email: string; avatar_url?: string | null }[]
  parentTasks?: {
    id: string
    title: string
    task_status_id: string | null
  }[]
  availableSkills?: {
    id: string
    name: string
    categoryCode?: string | null
  }[]
  proficiencyLevels?: {
    value: string
    label: string
  }[]
  projects?: {
    id: string
    name: string
  }[]
}

export interface TasksProps {
  shellMode?: 'app' | 'organization'
  workspaceView?: 'board' | 'list'
  baseRoute?: string
  tasks: {
    data: TaskDetail[]
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
    scope?: string
  }
  metadata: TaskMetadata
  projectOptions?: { id: string; name: string }[]
  projectContext?: {
    selectedProject: { id: string; name: string } | null
  }
  permissions?: {
    canCreateTask: boolean
    createTaskReason?: string | null
    canManageWorkflow?: boolean
    canAccessProjectSprints?: boolean
    canManageProjectSprints?: boolean
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
      current_project?: {
        id: string
        name: string
      } | null
      [key: string]: unknown
    }
  }
}

export interface TaskFilterProps {
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

export interface TaskItemProps {
  task: TaskDetail
  completedStatus?: string
  onToggleStatus: (task: TaskDetail, newStatus: string) => void
  formatDate: (dateString: string) => string
  statuses?: { value: string; label: string; color: string }[]
  priorities?: { value: string; label: string; color: string }[]
  labels?: { value: string; label: string; color: string }[]
  users?: {
    id: string
    username: string
    email: string
  }[]
  currentUser?: {
    id?: string
    role?: string
    organization_id?: string
  }
}
