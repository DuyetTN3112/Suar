import type {
  PrefilledTaskSkill,
  RoleMatchedProjectMember,
} from '@/apps/org/modules/tasks/lib/create_prefill'

export type TaskCreateSkill = PrefilledTaskSkill

export interface TaskCreateOrgMember {
  id: string
  username: string
  email: string
  orgRole?: string | null
}

export interface TaskCreateAssigneeGroups {
  projectMembers: RoleMatchedProjectMember[]
  orgMembersOutsideProject: TaskCreateOrgMember[]
}

export interface TaskCreateFormData {
  title: string
  description: string
  task_status_id: string
  task_type: string
  verification_method: string
  project_id: string
  priority: string
  label: string
  task_visibility: 'project' | 'internal' | 'external' | 'all'
  reviewer_visibility?: 'project' | 'internal' | 'external' | 'all'
  assigned_to: string
  reviewer_user_id?: string
  due_date: string
  parent_task_id: string
  estimated_time: string
  required_skills: TaskCreateSkill[]
  acceptance_criteria: string
  context_background: string
  role_in_task: string
  business_domain: string
  problem_category: string
  tech_stack_text: string
  learning_objectives_text: string
  domain_tags_text: string
  scope_text?: string
  out_of_scope_text?: string
  deliverables_text?: string
  quality_requirements_text?: string
  constraints_text?: string
  dependencies_text?: string
  authoring_mode?: 'operational_only' | 'evidence_enabled'
  authoring_intent?: 'save_draft' | 'publish'
  creator_confirmed?: boolean
  constraints_addressed?: boolean
  dependencies_addressed?: boolean
  supporting_reference_uri?: string
  supporting_reference_title?: string
  reviewer_role_code?: string
  profile_eligibility?: boolean
  project_context_version_id?: string
  work_package_version_id?: string
}
