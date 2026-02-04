/**
 * ProjectRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IProjectRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using ProjectInfraMapper.
 */

import { ProjectInfraMapper } from '../mapper/project_infra_mapper.js'

import NotFoundException from '#exceptions/not_found_exception'
import Project from '#infra/projects/models/project'
import type { ProjectEntity } from '#modules/projects/domain/entities/project_entity'
import type { ProjectRepository } from '#modules/projects/domain/repositories/project_repository_interface'
import type { DatabaseId } from '#types/database'

export class ProjectRepositoryImpl implements ProjectRepository {
  async findById(id: DatabaseId): Promise<ProjectEntity | null> {
    const model = await Project.find(id)
    return model ? ProjectInfraMapper.toDomain(model) : null
  }

  async findByOrganization(organizationId: DatabaseId): Promise<ProjectEntity[]> {
    const models = await Project.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => ProjectInfraMapper.toDomain(m))
  }

  async findByCreator(creatorId: DatabaseId): Promise<ProjectEntity[]> {
    const models = await Project.query()
      .where('creator_id', creatorId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => ProjectInfraMapper.toDomain(m))
  }

  async findByManager(managerId: DatabaseId): Promise<ProjectEntity[]> {
    const models = await Project.query()
      .where('manager_id', managerId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
    return models.map((m) => ProjectInfraMapper.toDomain(m))
  }

  async findNotDeletedOrFail(id: DatabaseId): Promise<ProjectEntity> {
    const model = await Project.query().where('id', id).whereNull('deleted_at').first()

    if (!model) {
      throw new NotFoundException('Project không tồn tại hoặc đã bị xóa')
    }
    return ProjectInfraMapper.toDomain(model)
  }
}
