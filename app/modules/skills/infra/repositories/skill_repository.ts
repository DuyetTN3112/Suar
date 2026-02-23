import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type UserSkill from '../../../users/infra/models/user_skill.js'

import * as skillQueries from './read/skill_queries.js'
import * as userSkillQueries from './read/user_skill_queries.js'

import type Skill from '#modules/skills/infra/models/skill'

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

  static activeSkillsWithPublishedRubrics() {
    return skillQueries.activeSkillsWithPublishedRubrics()
  }

  static searchActiveSkillsWithPublishedRubrics(keyword: string, limit?: number) {
    return skillQueries.searchActiveSkillsWithPublishedRubrics(keyword, limit)
  }

  static byCategory(categoryCode: string) {
    return skillQueries.byCategory(categoryCode)
  }

  static async getSpiderChartSkillIds(trx?: TransactionClientContract): Promise<{ id: string }[]> {
    return skillQueries.getSpiderChartSkillIds(trx)
  }

  static async findActiveByIds(ids: string[], trx?: TransactionClientContract): Promise<Skill[]> {
    return skillQueries.findActiveByIds(ids, trx)
  }

  static async findActiveByName(
    name: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return skillQueries.findActiveByName(name, trx)
  }

  static async createCustomSkill(
    payload: {
      id: string
      skill_code: string
      skill_name: string
      category_code: string
      display_type: string
      description: string | null
      icon_url: string | null
      is_active: boolean
      sort_order: number
    },
    trx?: TransactionClientContract
  ): Promise<Skill> {
    return skillQueries.createCustomSkill(payload, trx)
  }

  static async findByIds(ids: string[], trx?: TransactionClientContract): Promise<Skill[]> {
    return skillQueries.findByIds(ids, trx)
  }

  static async findActiveByIdsWithPublishedRubrics(
    ids: string[],
    trx?: TransactionClientContract
  ): Promise<Skill[]> {
    return skillQueries.findActiveByIdsWithPublishedRubrics(ids, trx)
  }

  // ── UserSkill queries ──

  static async findByUserAndSkill(userId: string, skillId: string) {
    return await userSkillQueries.findByUserAndSkill(userId, skillId)
  }

  static async getUserSkillsWithDetails(userId: string) {
    return await userSkillQueries.getUserSkillsWithDetails(userId)
  }

  static async findUserSkillsWithSkill(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkill[]> {
    return userSkillQueries.findUserSkillsWithSkill(userId, trx)
  }
}
