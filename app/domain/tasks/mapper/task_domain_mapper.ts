/**
 * TaskDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Tạo entity từ plain object (TaskEntityProps)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer
 * (TaskInfraMapper), KHÔNG phải ở đây.
 */

import { TaskEntity } from '../entities/task_entity.js'
import type { TaskEntityProps } from '../entities/task_entity.js'

export class TaskDomainMapper {
  private readonly __instanceMarker = true

  static {
    void new TaskDomainMapper().__instanceMarker
  }

  /**
   * Plain object (props) → Domain Entity
   */
  static toEntity(props: TaskEntityProps): TaskEntity {
    return new TaskEntity(props)
  }

  /**
   * Domain Entity → Plain object (props)
   */
  static toProps(entity: TaskEntity): TaskEntityProps {
    return {
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
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
