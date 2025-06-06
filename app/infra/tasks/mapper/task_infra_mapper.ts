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
import type Task from '#models/task'

export class TaskInfraMapper {
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
