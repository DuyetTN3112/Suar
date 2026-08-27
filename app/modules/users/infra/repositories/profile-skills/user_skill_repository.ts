import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { UserInfraMapper } from '#modules/users/infra/adapters/profile/user_infra_mapper'
import UserSkill from '#modules/users/infra/models/profile-skills/user_skill'
import type { UserSkillRecord } from '#modules/users/types/user_records'

export default class UserSkillRepository {
  private readonly __instanceMarker = true

  static {
    void new UserSkillRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserSkill.query({ client: trx }) : UserSkill.query()
  }

  static toRecord(userSkill: UserSkill): UserSkillRecord {
    return UserInfraMapper.toSkillRecord(userSkill)
  }

  static async findOwnedById(
    userSkillId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkill | null> {
    return this.baseQuery(trx).where('id', userSkillId).where('user_id', userId).first()
  }

  static async findByUserAndSkill(
    userId: string,
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkill | null> {
    return this.baseQuery(trx).where('user_id', userId).where('skill_id', skillId).first()
  }

  static async listByUser(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkillRecord[]> {
    const rows = await this.listModelsByUser(userId, trx)

    return rows.map((row) => this.toRecord(row))
  }

  static async listModelsByUser(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkill[]> {
    return this.baseQuery(trx)
      .where('user_id', userId)
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
