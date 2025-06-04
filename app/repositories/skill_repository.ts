import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Skill from '#models/skill'
import UserSkill from '#models/user_skill'

/**
 * SkillRepository
 *
 * Data access for Skill and UserSkill entities.
 * Extracted from Skill + UserSkill model static methods.
 */
export default class SkillRepository {
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
  ): Promise<Array<{ id: DatabaseId }>> {
    const query = trx ? Skill.query({ client: trx }) : Skill.query()
    const skills = await query
      .where('display_type', 'spider_chart')
      .where('is_active', true)
      .select('id')

    return skills.map((s) => ({ id: s.id }))
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
}
