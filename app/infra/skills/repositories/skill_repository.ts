import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as skillQueries from './read/skill_queries.js'
import * as userSkillQueries from './read/user_skill_queries.js'

import type Skill from '#infra/skills/models/skill'
import type UserSkill from '#infra/users/models/user_skill'
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
    return skillQueries.activeSkills()
  }

  static byCategory(categoryCode: string) {
    return skillQueries.byCategory(categoryCode)
  }

  static async getSpiderChartSkillIds(
    trx?: TransactionClientContract
  ): Promise<{ id: DatabaseId }[]> {
    return skillQueries.getSpiderChartSkillIds(trx)
  }

  static async findActiveByIds(
    ids: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Skill[]> {
    return skillQueries.findActiveByIds(ids, trx)
  }

  static async findByIds(ids: DatabaseId[], trx?: TransactionClientContract): Promise<Skill[]> {
    return skillQueries.findByIds(ids, trx)
  }

  // ── UserSkill queries ──

  static async findByUserAndSkill(userId: string, skillId: string) {
    return await userSkillQueries.findByUserAndSkill(userId, skillId)
  }

  static async getUserSkillsWithDetails(userId: string) {
    return await userSkillQueries.getUserSkillsWithDetails(userId)
  }

  static async findUserSkillsWithSkill(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkill[]> {
    return userSkillQueries.findUserSkillsWithSkill(userId, trx)
  }
}
