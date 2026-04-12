/**
 * TaskRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements ITaskRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using TaskInfraMapper.
 */

import { TaskInfraMapper } from '../mapper/task_infra_mapper.js'

import type { TaskEntity } from '#domain/tasks/entities/task_entity'
import type { TaskRepository } from '#domain/tasks/repositories/task_repository_interface'
import NotFoundException from '#exceptions/not_found_exception'
import Task from '#models/task'
import type { DatabaseId } from '#types/database'

export class TaskRepositoryImpl implements TaskRepository {
  async findById(id: DatabaseId): Promise<TaskEntity | null> {
    const model = await Task.find(id)
    return model ? TaskInfraMapper.toDomain(model) : null
  }

  async findByOrganization(organizationId: DatabaseId): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByProject(projectId: DatabaseId): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByAssignee(userId: DatabaseId): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByCreator(userId: DatabaseId): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('creator_id', userId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findNotDeletedOrFail(id: DatabaseId): Promise<TaskEntity> {
    const model = await Task.query().where('id', id).whereNull('deleted_at').first()

    if (!model) {
      throw new NotFoundException('Task không tồn tại hoặc đã bị xóa')
    }
    return TaskInfraMapper.toDomain(model)
  }
}
