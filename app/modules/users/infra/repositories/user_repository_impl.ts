/**
 * UserRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IUserRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using UserInfraMapper.
 */

import { UserInfraMapper } from '../mapper/user_infra_mapper.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import type { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserRepository } from '#modules/users/domain/repositories/user_repository_interface'
import User from '#modules/users/infra/models/user'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

export class UserRepositoryImpl implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const model = await User.find(id)
    return model ? UserInfraMapper.toDomain(model) : null
  }

  async findActiveOrFail(id: string): Promise<UserEntity> {
    const model = await User.query()
      .where('id', id)
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!model) {
      throw new NotFoundException('User không tồn tại hoặc không active')
    }
    return UserInfraMapper.toDomain(model)
  }

  async findNotDeletedOrFail(id: string): Promise<UserEntity> {
    const model = await User.query().where('id', id).whereNull('deleted_at').firstOrFail()
    return UserInfraMapper.toDomain(model)
  }

  async findByIds(ids: string[], selectFields?: string[]): Promise<UserEntity[]> {
    if (ids.length === 0) return []
    const cols = selectFields ?? ['id', 'username', 'email']
    const models = await User.query().whereIn('id', ids).select(cols)
    return models.map((m) => UserInfraMapper.toDomain(m))
  }

  async findByOrganization(organizationId: string): Promise<UserEntity[]> {
    const models = await User.query()
      .select(['users.id', 'users.username', 'users.email'])
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('organization_users.organization_id', organizationId)
      .whereNull('users.deleted_at')
      .orderBy('users.username', 'asc')
    return models.map((m) => UserInfraMapper.toDomain(m))
  }

  async findWithOrganizations(id: string): Promise<UserEntity> {
    const model = await User.query().where('id', id).preload('organizations').firstOrFail()
    return UserInfraMapper.toDomain(model)
  }

  async isActive(id: string): Promise<boolean> {
    try {
      await this.findActiveOrFail(id)
      return true
    } catch {
      return false
    }
  }

  async isFreelancer(id: string): Promise<boolean> {
    const model = await User.query().where('id', id).whereNull('deleted_at').first()
    return !!model?.is_freelancer
  }

  async isSuperadmin(id: string): Promise<boolean> {
    const model = await User.query().where('id', id).whereNull('deleted_at').first()
    return model?.system_role === SystemRoleName.SUPERADMIN
  }

  async isSystemAdmin(id: string): Promise<boolean> {
    const roleName = await this.getSystemRoleName(id)
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      roleName as SystemRoleName
    )
  }

  async getSystemRoleName(id: string): Promise<string | null> {
    const model = await User.query().where('id', id).whereNull('deleted_at').first()
    return model?.system_role ?? null
  }
}
