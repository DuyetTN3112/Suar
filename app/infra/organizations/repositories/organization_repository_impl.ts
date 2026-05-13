/**
 * OrganizationRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IOrganizationRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using OrganizationInfraMapper.
 */

import { OrganizationInfraMapper } from '../mapper/organization_infra_mapper.js'

import NotFoundException from '#exceptions/not_found_exception'
import Organization from '#infra/organizations/models/organization'
import type { OrganizationEntity } from '#modules/organizations/domain/entities/organization_entity'
import type { OrganizationRepository } from '#modules/organizations/domain/repositories/organization_repository_interface'
import type { DatabaseId } from '#types/database'

export class OrganizationRepositoryImpl implements OrganizationRepository {
  async findById(id: DatabaseId): Promise<OrganizationEntity | null> {
    const model = await Organization.find(id)
    return model ? OrganizationInfraMapper.toDomain(model) : null
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const model = await Organization.query().where('slug', slug).first()
    return model ? OrganizationInfraMapper.toDomain(model) : null
  }

  async findByOwnerId(ownerId: DatabaseId): Promise<OrganizationEntity[]> {
    const models = await Organization.query()
      .where('owner_id', ownerId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc')
    return models.map((m) => OrganizationInfraMapper.toDomain(m))
  }

  async findNotDeletedOrFail(id: DatabaseId): Promise<OrganizationEntity> {
    const model = await Organization.query().where('id', id).whereNull('deleted_at').first()

    if (!model) {
      throw new NotFoundException('Organization không tồn tại hoặc đã bị xóa')
    }
    return OrganizationInfraMapper.toDomain(model)
  }
}
