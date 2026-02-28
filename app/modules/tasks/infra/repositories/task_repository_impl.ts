/**
 * TaskRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements ITaskRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using TaskInfraMapper.
 */

import { TaskInfraMapper } from '../mapper/task_infra_mapper.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import type { TaskEntity } from '#modules/tasks/domain/entities/task_entity'
import type { TaskRepository } from '#modules/tasks/domain/repositories/task_repository_interface'
import Task from '#modules/tasks/infra/models/task'

export class TaskRepositoryImpl implements TaskRepository {
  async findById(id: string): Promise<TaskEntity | null> {
    const model = await Task.find(id)
    return model ? TaskInfraMapper.toDomain(model) : null
  }

  async findByOrganization(organizationId: string): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByProject(projectId: string): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .orderBy('sort_order', 'asc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByAssignee(userId: string): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findByCreator(userId: string): Promise<TaskEntity[]> {
    const models = await Task.query()
      .where('creator_id', userId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => TaskInfraMapper.toDomain(m))
  }

  async findNotDeletedOrFail(id: string): Promise<TaskEntity> {
    const model = await Task.query().where('id', id).whereNull('deleted_at').first()

    if (!model) {
      throw new NotFoundException('Task không tồn tại hoặc đã bị xóa')
    }
    return TaskInfraMapper.toDomain(model)
  }
}
