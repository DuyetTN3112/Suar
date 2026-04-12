import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import Skill from '#models/skill'
import UserSkill from '#models/user_skill'
import type { DatabaseId } from '#types/database'

/**
 * SkillRepository
 *
 * Data access for Skill and UserSkill entities.
 * Extracted from Skill + UserSkill model static methods.
 */
export default class SkillRepository {
  private readonly __instanceMarker = true

  static {
    void new SkillRepository().__instanceMarker
  }

  // ── Skill queries ──

  static activeSkills() {
    return Skill.query().where('is_active', true).orderBy('sort_order', 'asc')
  }

  static byCategory(categoryCode: string) {
    return Skill.query()
      .where('category_code', categoryCode)
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
  }

  static async getSpiderChartSkillIds(
    trx?: TransactionClientContract
  ): Promise<{ id: DatabaseId }[]> {
    const query = trx ? Skill.query({ client: trx }) : Skill.query()
    const skills = await query
      .where('display_type', 'spider_chart')
      .where('is_active', true)
      .select('id')

    return skills.map((s) => ({ id: s.id }))
  }

  static async findActiveByIds(
    ids: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Skill[]> {
    if (ids.length === 0) return []
    const query = trx ? Skill.query({ client: trx }) : Skill.query()
    return query.whereIn('id', ids).where('is_active', true)
  }

  static async findByIds(ids: DatabaseId[], trx?: TransactionClientContract): Promise<Skill[]> {
    if (ids.length === 0) return []
    const query = trx ? Skill.query({ client: trx }) : Skill.query()
    return query.whereIn('id', ids)
  }

  // ── UserSkill queries ──

  static async findByUserAndSkill(userId: string, skillId: string) {
    return await UserSkill.query().where('user_id', userId).where('skill_id', skillId).first()
  }

  static async getUserSkillsWithDetails(userId: string) {
    return await UserSkill.query()
      .where('user_id', userId)
      .preload('skill')
      .orderBy('created_at', 'desc')
  }

  static async findUserSkillsWithSkill(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill[]> {
    const query = trx ? UserSkill.query({ client: trx }) : UserSkill.query()
    return query.where('user_id', userId).preload('skill')
  }
}
