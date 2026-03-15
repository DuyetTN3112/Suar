import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { DatabaseId } from '#types/database'
import { SystemRoleName } from '#constants'
import User from '#models/user'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * UserRepository
 *
 * Data access for users (active checks, role lookups).
 * Extracted from User model static methods.
 */
export default class UserRepository {
  static async findActiveOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query
      .where('id', userId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!user) {
      throw new NotFoundException('User không tồn tại hoặc không active')
    }
    return user
  }

  static async isActive(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await this.findActiveOrFail(userId, trx)
      return true
    } catch {
      return false
    }
  }

  static async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return !!user?.is_freelancer
  }

  static async isSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role === SystemRoleName.SUPERADMIN
  }

  static async findNotDeletedOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).whereNull('deleted_at').firstOrFail()
  }

  static async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role ?? null
  }

  static async isSystemAdmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const roleName = await this.getSystemRoleName(userId, trx)
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      roleName as SystemRoleName
    )
  }

  static async findByIds(
    userIds: DatabaseId[],
    selectColumns: string[] = ['id', 'username', 'email'],
    trx?: TransactionClientContract
  ): Promise<User[]> {
    if (userIds.length === 0) return []
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereIn('id', userIds).select(selectColumns)
  }

  static async findByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<User[]> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query
      .select(['users.id', 'users.username', 'users.email'])
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('organization_users.organization_id', organizationId)
      .whereNull('users.deleted_at')
      .orderBy('users.username', 'asc')
  }

  static async findById(userId: DatabaseId, trx?: TransactionClientContract): Promise<User | null> {
    if (trx) {
      return User.query({ client: trx }).where('id', userId).first()
    }
    return User.find(userId)
  }

  static async findWithOrganizations(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.where('id', userId).preload('organizations').firstOrFail()
  }

  static queryNotDeleted(
    trx?: TransactionClientContract
  ): ModelQueryBuilderContract<typeof User, User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    return query.whereNull('deleted_at')
  }

  static async findProfileWithRelations(
    userId: DatabaseId,
    options: { includeSkills?: boolean },
    trx?: TransactionClientContract
  ): Promise<User> {
    const query = trx ? User.query({ client: trx }) : User.query()
    void query.where('id', userId).whereNull('deleted_at').preload('current_organization')

    if (options.includeSkills) {
      void query.preload('skills', (skillsQuery) => {
        void skillsQuery.preload('skill')
      })
    }

    return query.firstOrFail()
  }
}
