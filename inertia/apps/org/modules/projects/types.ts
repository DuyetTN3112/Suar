import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ProjectUserSummary {
  id: string
  username: string
  email: string
  current_organization_id?: string | null
  organizations?: {
    id: string
    name: string
  }[]
}

export interface Organization {
  id: string
  name: string
}

export interface OrganizationCandidate {
  id: string
  username: string
  email: string | null
}

export interface ProjectStatus {
  value: string
  label: string
  description?: string
}

export interface ProjectMember {
  id?: string
  user_id?: string
  username: string
  email: string
  role: string
  project_professional_role_id?: string | null
  professional_role_name?: string | null
  professional_role_code?: string | null
  joined_at?: string
  task_count?: number
  reviewed_skills_count?: number
  imported_skills_count?: number
  under_dispute_skills_count?: number
  latest_confidence_signal?: 'low' | 'medium' | 'high' | null
}

export interface ProjectTaskSummary {
  id: string
  title: string
  description?: string
  status: string
  label?: string
  priority?: string
  assignee_name?: string
  due_date?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  organization_id: string
  organization_name?: string
  creator_id: string
  creator_name?: string
  manager_id?: string
  manager_name?: string
  start_date?: string
  end_date?: string
  status?: string
  visibility?: 'public' | 'private' | 'team'
  business_domains?: string[]
  created_at: string
  updated_at: string
}

export interface ProjectsIndexProps {
  projects: Project[]
  pagination: {
    mode: 'offset' | 'cursor'
    page: number
    perPage: number
    total: number
    lastPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  filters: {
    search?: string
    status?: string
    creator_id?: string
    manager_id?: string
    visibility?: 'public' | 'private' | 'team'
    sort_by?: 'created_at' | 'name' | 'start_date' | 'end_date'
    sort_order?: 'asc' | 'desc'
  }
  stats: {
    total_projects: number
    active_projects: number
    completed_projects: number
  }
  auth: {
    user?: ProjectUserSummary | null
  }
  showOrganizationRequiredModal?: boolean
}

export interface ProjectShowProps {
  shellMode?: 'app' | 'organization'
  baseRoute?: string
  project: Project
  members: ProjectMember[]
  tasks: ProjectTaskSummary[]
  project_context?: {
    active_version_id: string | null
    active_version_number: number
    context: {
      id: string
      version_number: number
      title: string
      summary: string
      rich_content: TvaJsonValue
      plain_text_projection: string
      active_from: string
      retired_at: string | null
      privacy_classification: string
      created_at: string
    } | null
  } | null
  tasks_summary?: {
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }
  review_governance?: {
    total_sessions: number
    pending_sessions: number
    overdue_sessions: number
    disputed_sessions: number
    completed_sessions: number
    required_pending_assignments: number
    fallback_pending_assignments: number
    completion_rate: number
  }
  project_reverse_reviews?: {
    total_reviews: number
    anonymous_reviews: number
    average_rating: number | null
    recent: Array<{
      id: string
      reviewer_id: string | null
      reviewer_username: string | null
      rating: number
      comment: string | null
      is_anonymous: boolean
      created_at: string
    }>
  }
  permissions: {
    isCreator: boolean
    isManager: boolean
    isMember: boolean
    isOwner?: boolean
    canEdit?: boolean
    canDelete?: boolean
    canAddMembers?: boolean
  }
  auth: {
    user?: ProjectUserSummary | null
  }
}

export interface ProjectCreateProps {
  organizations: Organization[]
  organizationMembersByOrg: Record<string, OrganizationCandidate[]>
  statuses: ProjectStatus[]
  auth: {
    user?: ProjectUserSummary | null
  }
}
