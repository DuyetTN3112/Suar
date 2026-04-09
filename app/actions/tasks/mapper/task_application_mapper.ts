/**
 * TaskApplicationMapper — Application Layer Mapper
 *
 * Maps between Request DTOs ↔ Domain Entity ↔ Response DTOs.
 *
 * Flow:
 *   Write: Request DTO → Domain Entity (partial)
 *   Read:  Domain Entity → Response DTO
 */

import { type TaskEntity } from '#domain/tasks/entities/task_entity'
import type CreateTaskDTO from '../dtos/request/create_task_dto.js'
import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'
import {
  TaskDetailResponseDTO,
  TaskListItemResponseDTO,
  TaskSummaryResponseDTO,
} from '../dtos/response/task_response_dtos.js'

export class TaskApplicationMapper {
  private readonly __instanceMarker = true

  static {
    void new TaskApplicationMapper().__instanceMarker
  }

  /**
   * CreateTaskDTO → partial domain entity props (for creation)
   */
  static fromCreateDTO(dto: CreateTaskDTO): {
    title: string
    description: string | undefined
    taskStatusId: string
    label: string | undefined
    priority: string | undefined
    assignedTo: string | undefined
    dueDate: Date | undefined
    parentTaskId: string | undefined
    estimatedTime: number
    actualTime: number
    projectId: string
    organizationId: string
  } {
    return {
      title: dto.title,
      description: dto.description,
      taskStatusId: dto.task_status_id,
      label: dto.label,
      priority: dto.priority,
      assignedTo: dto.assigned_to,
      dueDate: dto.due_date?.toJSDate(),
      parentTaskId: dto.parent_task_id,
      estimatedTime: dto.estimated_time,
      actualTime: dto.actual_time,
      projectId: dto.project_id,
      organizationId: dto.organization_id,
    }
  }

  /**
   * UpdateTaskDTO → partial update fields
   */
  static fromUpdateDTO(dto: UpdateTaskDTO): {
    title?: string
    description?: string
    label?: string | null
    priority?: string | null
    assignedTo?: string | null
    dueDate?: Date | null
    parentTaskId?: string | null
    estimatedTime?: number
    actualTime?: number
    projectId?: string
    updatedBy?: string
  } {
    const result: {
      title?: string
      description?: string
      label?: string | null
      priority?: string | null
      assignedTo?: string | null
      dueDate?: Date | null
      parentTaskId?: string | null
      estimatedTime?: number
      actualTime?: number
      projectId?: string
      updatedBy?: string
    } = {}
    if (dto.title !== undefined) result.title = dto.title
    if (dto.description !== undefined) result.description = dto.description
    if (dto.label !== undefined) result.label = dto.label
    if (dto.priority !== undefined) result.priority = dto.priority
    if (dto.assigned_to !== undefined) result.assignedTo = dto.assigned_to
    if (dto.due_date !== undefined) result.dueDate = dto.due_date?.toJSDate() ?? null
    if (dto.parent_task_id !== undefined) result.parentTaskId = dto.parent_task_id
    if (dto.estimated_time !== undefined) result.estimatedTime = dto.estimated_time
    if (dto.actual_time !== undefined) result.actualTime = dto.actual_time
    if (dto.project_id !== undefined) result.projectId = dto.project_id
    if (dto.updated_by !== undefined) result.updatedBy = dto.updated_by
    return result
  }

  /**
   * Domain Entity → TaskDetailResponseDTO (full detail view)
   */
  static toDetailResponse(entity: TaskEntity): TaskDetailResponseDTO {
    return new TaskDetailResponseDTO({
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      taskStatusId: entity.taskStatusId,
      label: entity.label,
      priority: entity.priority,
      difficulty: entity.difficulty,
      assignedTo: entity.assignedTo,
      creatorId: entity.creatorId,
      updatedBy: entity.updatedBy,
      dueDate: entity.dueDate,
      parentTaskId: entity.parentTaskId,
      estimatedTime: entity.estimatedTime,
      actualTime: entity.actualTime,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      taskVisibility: entity.taskVisibility,
      applicationDeadline: entity.applicationDeadline,
      estimatedBudget: entity.estimatedBudget,
      externalApplicationsCount: entity.externalApplicationsCount,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }

  /**
   * Domain Entity → TaskListItemResponseDTO (list view)
   */
  static toListItemResponse(entity: TaskEntity): TaskListItemResponseDTO {
    return new TaskListItemResponseDTO({
      id: entity.id,
      title: entity.title,
      status: entity.status,
      label: entity.label,
      priority: entity.priority,
      difficulty: entity.difficulty,
      assignedTo: entity.assignedTo,
      dueDate: entity.dueDate,
      organizationId: entity.organizationId,
      projectId: entity.projectId,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
    })
  }

  /**
   * Domain Entity → TaskSummaryResponseDTO (minimal reference)
   */
  static toSummaryResponse(entity: TaskEntity): TaskSummaryResponseDTO {
    return new TaskSummaryResponseDTO({
      id: entity.id,
      title: entity.title,
      status: entity.status,
      priority: entity.priority,
    })
  }
}
