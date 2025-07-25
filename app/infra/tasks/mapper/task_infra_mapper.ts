/**
 * TaskInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { TaskEntity } from '#domain/tasks/entities/task_entity'
import type { TaskEntityProps } from '#domain/tasks/entities/task_entity'
import type Task from '#infra/tasks/models/task'
import type TaskApplication from '#infra/tasks/models/task_application'
import type TaskAssignment from '#infra/tasks/models/task_assignment'
import type User from '#infra/users/models/user'
import type {
  TaskApplicationRecord,
  TaskAssignmentWithDetailsRecord,
  TaskAuditValues,
  TaskDetailRecord,
  TaskListRecord,
  TaskRecord,
} from '#types/task_records'

function serializeDateTime(value: { toISO(): string | null } | null | undefined): string | null {
  return value?.toISO() ?? null
}

export class TaskInfraMapper {
  private readonly __instanceMarker = true

  static {
    void new TaskInfraMapper().__instanceMarker
  }

  /**
   * ORM Entity (Lucid Model) → Domain Entity
   */
  static toDomain(model: Task): TaskEntity {
    const props: TaskEntityProps = {
      id: model.id,
      title: model.title,
      description: model.description,
      status: model.status as TaskEntityProps['status'],
      taskStatusId: model.task_status_id,
      label: model.label as TaskEntityProps['label'],
      priority: model.priority as TaskEntityProps['priority'],
      difficulty: model.difficulty as TaskEntityProps['difficulty'],
      assignedTo: model.assigned_to,
      creatorId: model.creator_id,
      updatedBy: model.updated_by,
      dueDate: model.due_date?.toJSDate() ?? null,
      parentTaskId: model.parent_task_id,
      estimatedTime: model.estimated_time,
      actualTime: model.actual_time,
      organizationId: model.organization_id,
      projectId: model.project_id,
      taskVisibility: model.task_visibility as TaskEntityProps['taskVisibility'],
      applicationDeadline: model.application_deadline?.toJSDate() ?? null,
      estimatedBudget: model.estimated_budget,
      externalApplicationsCount: model.external_applications_count,
      sortOrder: model.sort_order,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new TaskEntity(props)
  }

  static toRecord(model: Task): TaskRecord {
    return {
      id: model.id,
      title: model.title,
      description: model.description,
      status: model.status,
      task_status_id: model.task_status_id,
      label: model.label,
      priority: model.priority,
      difficulty: model.difficulty,
      assigned_to: model.assigned_to,
      creator_id: model.creator_id,
      updated_by: model.updated_by,
      due_date: serializeDateTime(model.due_date),
      deleted_at: serializeDateTime(model.deleted_at),
      created_at: serializeDateTime(model.created_at),
      updated_at: serializeDateTime(model.updated_at),
      parent_task_id: model.parent_task_id,
      estimated_time: model.estimated_time,
      actual_time: model.actual_time,
      organization_id: model.organization_id,
      project_id: model.project_id,
      task_visibility: model.task_visibility,
      application_deadline: serializeDateTime(model.application_deadline),
      task_type: model.task_type,
      acceptance_criteria: model.acceptance_criteria,
      verification_method: model.verification_method,
      expected_deliverables: model.expected_deliverables,
      context_background: model.context_background,
      impact_scope: model.impact_scope,
      tech_stack: model.tech_stack,
      environment: model.environment,
      collaboration_type: model.collaboration_type,
      complexity_notes: model.complexity_notes,
      measurable_outcomes: model.measurable_outcomes,
      learning_objectives: model.learning_objectives,
      domain_tags: model.domain_tags,
      role_in_task: model.role_in_task,
      autonomy_level: model.autonomy_level,
      problem_category: model.problem_category,
      business_domain: model.business_domain,
      estimated_users_affected: model.estimated_users_affected,
      estimated_budget: model.estimated_budget,
      external_applications_count: model.external_applications_count,
      sort_order: model.sort_order,
    }
  }

  static toDetailRecord(model: Task): TaskDetailRecord {
    return {
      ...(model.serialize() as Record<string, unknown>),
      ...this.toRecord(model),
    }
  }

  static toListRecord(model: Task): TaskListRecord {
    return this.toRecord(model)
  }

  static toApplicationRecord(model: TaskApplication): TaskApplicationRecord {
    const task = model.$preloaded.task as Task | undefined
    const applicant = model.$preloaded.applicant as User | undefined
    const reviewer = model.$preloaded.reviewer as User | undefined

    return {
      id: model.id,
      task_id: model.task_id,
      applicant_id: model.applicant_id,
      application_status: model.application_status,
      application_source: model.application_source,
      message: model.message,
      expected_rate: model.expected_rate,
      portfolio_links: model.portfolio_links,
      applied_at: serializeDateTime(model.applied_at),
      reviewed_by: model.reviewed_by,
      reviewed_at: serializeDateTime(model.reviewed_at),
      rejection_reason: model.rejection_reason,
      task: task ? this.toDetailRecord(task) : undefined,
      applicant: applicant ? this.toUserSummaryRecord(applicant) : undefined,
      reviewer: reviewer ? this.toUserSummaryRecord(reviewer) : null,
    }
  }

  static toAssignmentWithDetailsRecord(
    model: TaskAssignment
  ): TaskAssignmentWithDetailsRecord {
    const task = model.$preloaded.task as Task | undefined
    const assignee = model.$preloaded.assignee as User | undefined
    if (!task || !assignee) {
      throw new Error('Task assignment details must be preloaded before mapping')
    }

    return {
      id: model.id,
      task_id: model.task_id,
      assignee_id: model.assignee_id,
      assigned_by: model.assigned_by,
      assignment_type: model.assignment_type,
      assignment_status: model.assignment_status,
      task: this.toRecord(task),
      assignee: {
        id: assignee.id,
        username: assignee.username,
      },
    }
  }

  private static toUserSummaryRecord(model: User): Record<string, unknown> {
    return {
      id: model.id,
      username: model.username,
      email: model.email,
      avatar_url: model.avatar_url,
    }
  }

  static toAuditValues(model: Task): TaskAuditValues {
    return {
      id: model.id,
      title: model.title,
      description: model.description,
      status: model.status,
      taskStatusId: model.task_status_id,
      label: model.label,
      priority: model.priority,
      difficulty: model.difficulty,
      assignedTo: model.assigned_to,
      creatorId: model.creator_id,
      updatedBy: model.updated_by,
      dueDate: serializeDateTime(model.due_date),
      deletedAt: serializeDateTime(model.deleted_at),
      createdAt: serializeDateTime(model.created_at),
      updatedAt: serializeDateTime(model.updated_at),
      parentTaskId: model.parent_task_id,
      estimatedTime: model.estimated_time,
      actualTime: model.actual_time,
      organizationId: model.organization_id,
      projectId: model.project_id,
      taskVisibility: model.task_visibility,
      applicationDeadline: serializeDateTime(model.application_deadline),
      taskType: model.task_type,
      acceptanceCriteria: model.acceptance_criteria,
      verificationMethod: model.verification_method,
      expectedDeliverables: model.expected_deliverables,
      contextBackground: model.context_background,
      impactScope: model.impact_scope,
      techStack: model.tech_stack,
      environment: model.environment,
      collaborationType: model.collaboration_type,
      complexityNotes: model.complexity_notes,
      measurableOutcomes: model.measurable_outcomes,
      learningObjectives: model.learning_objectives,
      domainTags: model.domain_tags,
      roleInTask: model.role_in_task,
      autonomyLevel: model.autonomy_level,
      problemCategory: model.problem_category,
      businessDomain: model.business_domain,
      estimatedUsersAffected: model.estimated_users_affected,
      estimatedBudget: model.estimated_budget,
      externalApplicationsCount: model.external_applications_count,
      sortOrder: model.sort_order,
    }
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<TaskEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.title !== undefined) result.title = entity.title
    if (entity.description !== undefined) result.description = entity.description
    if (entity.status !== undefined) result.status = entity.status
    if (entity.taskStatusId !== undefined) result.task_status_id = entity.taskStatusId
    if (entity.label !== undefined) result.label = entity.label
    if (entity.priority !== undefined) result.priority = entity.priority
    if (entity.difficulty !== undefined) result.difficulty = entity.difficulty
    if (entity.assignedTo !== undefined) result.assigned_to = entity.assignedTo
    if (entity.creatorId !== undefined) result.creator_id = entity.creatorId
    if (entity.updatedBy !== undefined) result.updated_by = entity.updatedBy
    if (entity.dueDate !== undefined) result.due_date = entity.dueDate
    if (entity.parentTaskId !== undefined) result.parent_task_id = entity.parentTaskId
    if (entity.estimatedTime !== undefined) result.estimated_time = entity.estimatedTime
    if (entity.actualTime !== undefined) result.actual_time = entity.actualTime
    if (entity.organizationId !== undefined) result.organization_id = entity.organizationId
    if (entity.projectId !== undefined) result.project_id = entity.projectId
    if (entity.taskVisibility !== undefined) result.task_visibility = entity.taskVisibility
    if (entity.applicationDeadline !== undefined)
      result.application_deadline = entity.applicationDeadline
    if (entity.estimatedBudget !== undefined) result.estimated_budget = entity.estimatedBudget
    if (entity.externalApplicationsCount !== undefined)
      result.external_applications_count = entity.externalApplicationsCount
    if (entity.sortOrder !== undefined) result.sort_order = entity.sortOrder

    return result
  }
}
