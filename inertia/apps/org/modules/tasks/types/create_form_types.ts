import type { PrefilledTaskSkill, RoleMatchedProjectMember } from '@/apps/org/modules/tasks/lib/create_prefill'

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
  task_visibility: 'internal' | 'external' | 'all'
  assigned_to: string
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
}
