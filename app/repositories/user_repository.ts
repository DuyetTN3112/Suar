import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
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

  static async isFreelancer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? User.query({ client: trx }) : User.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return !!user?.is_freelancer
  }

  static async isSuperadmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
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
}
