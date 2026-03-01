
export type SerializedDateTime = string | null

export interface TaskRecord {
  id: string
  title: string
  description: string
  status: string
  task_status_id: string | null
  label?: string
  priority: string
  difficulty?: string | null
  assigned_to: string | null
  creator_id: string
  updated_by?: string | null
  due_date?: SerializedDateTime
  deleted_at?: SerializedDateTime
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
  parent_task_id?: string | null
  estimated_time?: number
  actual_time?: number
  organization_id: string
  project_id: string | null
  task_visibility?: string
  application_deadline?: SerializedDateTime
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Record<string, unknown>[]
  context_background?: string | null
  impact_scope?: string | null
  tech_stack?: string[]
  environment?: string | null
  collaboration_type?: string | null
  complexity_notes?: string | null
  measurable_outcomes?: Record<string, unknown>[]
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string | null
  autonomy_level?: string | null
  problem_category?: string | null
  business_domain?: string | null
  estimated_users_affected?: number | null
  estimated_budget?: number | null
  external_applications_count?: number
  sort_order?: number
  assignee?: {
    username: string
    [key: string]: unknown
  } | null
}

export interface TaskIdentityRecord {
  id: string
  organization_id: string
}

export type TaskDetailRecord = TaskRecord
export type TaskListRecord = TaskRecord
export type TaskAuditValues = Record<string, unknown>
export type TaskDetailRelation = 'childTasks' | 'versions'

export interface CreateTaskRepositoryResult {
  task: TaskRecord
  auditValues: TaskAuditValues
}

export interface TaskStatusRecord {
  id: string
  organization_id: string
  name: string
  slug: string
  category: string
  color: string
  icon: string | null
  description: string | null
  sort_order: number
  is_default: boolean
  is_system: boolean
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
  deleted_at?: SerializedDateTime
}

export interface TaskApplicationRecord {
  id: string
  task_id: string
  applicant_id: string
  application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  application_source: 'public_listing' | 'invitation' | 'referral'
  message: string | null
  expected_rate: number | null
  portfolio_links: string[] | null
  applied_at?: SerializedDateTime
  reviewed_by: string | null
  reviewed_at?: SerializedDateTime
  rejection_reason: string | null
  task?: TaskRecord
  applicant?: Record<string, unknown>
  reviewer?: Record<string, unknown> | null
}

export interface PaginatedTaskApplicationRecords {
  data: TaskApplicationRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface TaskWorkflowTransitionRecord {
  id: string
  organization_id: string
  from_status_id: string
  to_status_id: string
  conditions: Record<string, unknown>
  created_at?: SerializedDateTime
  fromStatus?: TaskStatusRecord | Record<string, unknown>
  toStatus?: TaskStatusRecord | Record<string, unknown>
}

export interface TaskAssignmentWithDetailsRecord {
  id: string
  task_id: string
  assignee_id: string
  assigned_by: string
  assignment_type: 'member' | 'freelancer' | 'volunteer'
  assignment_status: 'active' | 'completed' | 'cancelled'
  task: TaskRecord
  assignee: {
    id: string
    username: string
    [key: string]: unknown
  }
}
