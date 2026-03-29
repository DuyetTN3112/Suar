import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import UserSkill from '#models/user_skill'

export default class UserSkillRepository {
  private readonly __instanceMarker = true

  static {
    void new UserSkillRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserSkill.query({ client: trx }) : UserSkill.query()
  }

  static async findOwnedById(
    userSkillId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill | null> {
    return this.baseQuery(trx).where('id', userSkillId).where('user_id', userId).first()
  }

  static async findOwnedByIdWithSkill(
    userSkillId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill | null> {
    return this.baseQuery(trx)
      .where('id', userSkillId)
      .where('user_id', userId)
      .preload('skill')
      .first()
  }

  static async findByUserAndSkill(
    userId: DatabaseId,
    skillId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill | null> {
    return this.baseQuery(trx).where('user_id', userId).where('skill_id', skillId).first()
  }

  static async listByUserWithSkill(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill[]> {
    return this.baseQuery(trx)
      .where('user_id', userId)
      .preload('skill')
      .orderBy('total_reviews', 'desc')
  }

  static async create(
    data: Partial<UserSkill>,
    trx?: TransactionClientContract
  ): Promise<UserSkill> {
    return UserSkill.create(data, trx ? { client: trx } : undefined)
  }

  static async save(userSkill: UserSkill, trx?: TransactionClientContract): Promise<UserSkill> {
    if (trx) {
      userSkill.useTransaction(trx)
    }
    await userSkill.save()
    return userSkill
  }

  static async delete(userSkill: UserSkill, trx?: TransactionClientContract): Promise<void> {
    if (trx) {
      userSkill.useTransaction(trx)
    }
    await userSkill.delete()
  }
}
