import type { DateTime } from 'luxon'

import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type { DatabaseId } from '#types/database'

interface TaskStatusSelection {
  id: string
  category: string
}

export interface CreateTaskPersistencePayload {
  title: string
  description: string
  status: string
  task_status_id: string
  task_type: string
  acceptance_criteria: string
  verification_method: string
  expected_deliverables: Record<string, unknown>[]
  context_background: string | null
  impact_scope: string | null
  tech_stack: string[]
  environment: string | null
  collaboration_type: string | null
  complexity_notes: string | null
  measurable_outcomes: Record<string, unknown>[]
  learning_objectives: string[]
  domain_tags: string[]
  role_in_task: string | null
  autonomy_level: string | null
  problem_category: string | null
  business_domain: string | null
  estimated_users_affected: number | null
  label?: string
  priority?: string
  assigned_to: DatabaseId | null
  due_date: DateTime
  parent_task_id: DatabaseId | null
  estimated_time: number
  actual_time: number
  project_id: DatabaseId
  organization_id: DatabaseId
  creator_id: DatabaseId
}

export function buildCreateTaskPersistencePayload(
  dto: CreateTaskDTO,
  userId: DatabaseId,
  selectedStatus: TaskStatusSelection,
  resolvedDueDate: DateTime
): CreateTaskPersistencePayload {
  return {
    title: dto.title,
    description: dto.description ?? '',
    status: selectedStatus.category,
    task_status_id: selectedStatus.id,
    task_type: dto.task_type,
    acceptance_criteria: dto.acceptance_criteria,
    verification_method: dto.verification_method,
    expected_deliverables: dto.expected_deliverables,
    context_background: dto.context_background ?? null,
    impact_scope: dto.impact_scope ?? null,
    tech_stack: dto.tech_stack,
    environment: dto.environment ?? null,
    collaboration_type: dto.collaboration_type ?? null,
    complexity_notes: dto.complexity_notes ?? null,
    measurable_outcomes: dto.measurable_outcomes,
    learning_objectives: dto.learning_objectives,
    domain_tags: dto.domain_tags,
    role_in_task: dto.role_in_task ?? null,
    autonomy_level: dto.autonomy_level ?? null,
    problem_category: dto.problem_category ?? null,
    business_domain: dto.business_domain ?? null,
    estimated_users_affected: dto.estimated_users_affected ?? null,
    label: dto.label ?? undefined,
    priority: dto.priority ?? undefined,
    assigned_to: dto.assigned_to ?? null,
    due_date: resolvedDueDate,
    parent_task_id: dto.parent_task_id ?? null,
    estimated_time: dto.estimated_time,
    actual_time: dto.actual_time,
    project_id: dto.project_id,
    organization_id: dto.organization_id,
    creator_id: userId,
  }
}
