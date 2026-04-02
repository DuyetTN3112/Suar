import type { TaskTransaction } from './task_transaction.js'

export interface TaskTalentMatchContextSource {
  task_id: string
  business_domain: string | null
  problem_category: string | null
  task_type: string | null
  requirement_id: string | null
  skill_id: string | null
  required_public_proficiency_code: string | null
  is_mandatory: boolean | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  importance: string | null
  weight: number | string | null
  project_skill_id: string | null
  rubric_version_id: string | null
}

export interface AssignmentDeliverySource {
  assignment_id: string
  task_id: string
  assignee_id: string
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string
  completed_at: Date | string | null
  task_due_date: Date | string | null
}

export interface CompletedAssignmentProfileSource {
  task_assignment_id: string
  task_id: string
  organization_id: string
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: unknown
  domain_tags: unknown
  difficulty: string | null
  estimated_time: number | string | null
  actual_time: number | string | null
  assignment_estimated_hours: number | string | null
  assignment_actual_hours: number | string | null
  due_date: Date | string | null
  completed_at: Date | string | null
  measurable_outcomes: unknown
  impact_scope: string | null
}

export interface ReviewAssignmentContextSource {
  assignment_id: string
  task_id: string
  assignee_id: string
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  completion_notes: string | null
  task_title: string
  task_description: string
  task_status: string
  task_priority: string
  task_difficulty: string | null
  task_due_date: Date | string | null
  project_id: string | null
  organization_id: string
}

export abstract class TaskFactSourceReader {
  abstract listTalentMatchContext(
    lookup: string,
    organizationId: string | null,
    transaction?: TaskTransaction
  ): Promise<TaskTalentMatchContextSource[]>

  abstract listAssignmentDelivery(
    userId: string,
    transaction?: TaskTransaction
  ): Promise<AssignmentDeliverySource[]>

  abstract listCompletedAssignmentProfiles(
    userId: string,
    transaction?: TaskTransaction
  ): Promise<CompletedAssignmentProfileSource[]>

  abstract findReviewAssignmentContexts(
    assignmentIds: string[],
    transaction?: TaskTransaction
  ): Promise<ReviewAssignmentContextSource[]>

  abstract listAssignmentIdsByTaskIds(
    taskIds: string[],
    transaction?: TaskTransaction
  ): Promise<string[]>

  abstract listAssignmentIdsByProjectIds(
    projectIds: string[],
    transaction?: TaskTransaction
  ): Promise<string[]>

  abstract listAssignmentIdsByProjectIdsIncludingDeletedTasks(
    projectIds: string[],
    transaction?: TaskTransaction
  ): Promise<string[]>

  abstract listAssignmentIdsByTaskStatusIds(
    taskStatusIds: string[],
    transaction?: TaskTransaction
  ): Promise<string[]>
}
