/**
 * UserRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IUserRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using UserInfraMapper.
 */

import { UserInfraMapper } from '../mapper/user_infra_mapper.js'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { UserEntity } from '#modules/users/domain/entities/user_entity'
import type { UserRepository } from '#modules/users/domain/repositories/user_repository_interface'
import User from '#modules/users/infra/models/user'
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'

export class UserRepositoryImpl implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const model = await User.find(id)
    return model ? UserInfraMapper.toDomain(model) : null
  }

  async findActiveOrFail(id: string): Promise<UserEntity> {
    const model = await User.query()
      .where('id', id)
      .whereNull('deleted_at')
      .where('status', UserStatusName.ACTIVE)
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

  async isActive(id: string): Promise<boolean> {
    const model = await User.query()
      .where('id', id)
      .whereNull('deleted_at')
      .where('status', UserStatusName.ACTIVE)
      .select('id')
      .first()

    return model !== null
  }

  async isExternalContributor(id: string): Promise<boolean> {
    const model = await User.query().where('id', id).whereNull('deleted_at').first()
    return !!model?.is_external_contributor
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
