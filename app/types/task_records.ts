import type { DatabaseId } from '#types/database'

export type SerializedDateTime = string | null

export interface TaskRecord {
  id: DatabaseId
  title: string
  description: string
  status: string
  task_status_id: DatabaseId | null
  label?: string
  priority: string
  difficulty?: string | null
  assigned_to: DatabaseId | null
  creator_id: DatabaseId
  updated_by?: DatabaseId | null
  due_date?: SerializedDateTime
  deleted_at?: SerializedDateTime
  created_at?: SerializedDateTime
  updated_at?: SerializedDateTime
  parent_task_id?: DatabaseId | null
  estimated_time?: number
  actual_time?: number
  organization_id: DatabaseId
  project_id: DatabaseId | null
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
  id: DatabaseId
  organization_id: DatabaseId
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
  id: DatabaseId
  organization_id: DatabaseId
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
  id: DatabaseId
  task_id: DatabaseId
  applicant_id: DatabaseId
  application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  application_source: 'public_listing' | 'invitation' | 'referral'
  message: string | null
  expected_rate: number | null
  portfolio_links: string[] | null
  applied_at?: SerializedDateTime
  reviewed_by: DatabaseId | null
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
  id: DatabaseId
  organization_id: DatabaseId
  from_status_id: DatabaseId
  to_status_id: DatabaseId
  conditions: Record<string, unknown>
  created_at?: SerializedDateTime
  fromStatus?: TaskStatusRecord | Record<string, unknown>
  toStatus?: TaskStatusRecord | Record<string, unknown>
}

export interface TaskAssignmentWithDetailsRecord {
  id: DatabaseId
  task_id: DatabaseId
  assignee_id: DatabaseId
  assigned_by: DatabaseId
  assignment_type: 'member' | 'freelancer' | 'volunteer'
  assignment_status: 'active' | 'completed' | 'cancelled'
  task: TaskRecord
  assignee: {
    id: DatabaseId
    username: string
    [key: string]: unknown
  }
}
