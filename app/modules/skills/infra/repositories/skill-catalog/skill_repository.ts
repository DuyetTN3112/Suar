import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as skillQueries from './read/skill_queries.js'
import * as customSkillCatalogMutations from './write/custom_skill_catalog_mutations.js'

import type Skill from '#modules/skills/infra/models/skill-catalog/skill'

/**
 * SkillRepository
 *
 * Data access for Skill entities.
 * User-owned skill associations are handled by the users module.
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

  static async findActiveSkillIdsByCategoryCodes(
    categoryCodes: string[]
  ): Promise<{ id: string }[]> {
    return skillQueries.findActiveSkillIdsByCategoryCodes(categoryCodes)
  }

  static async findSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<{ id: string }[]> {
    return skillQueries.findSkillIdsByCategoryCodes(categoryCodes)
  }

  static async getSpiderChartSkillIds(trx?: TransactionClientContract): Promise<{ id: string }[]> {
    return skillQueries.getSpiderChartSkillIds(trx)
  }

  static async findActiveByIds(ids: string[], trx?: TransactionClientContract): Promise<Skill[]> {
    return skillQueries.findActiveByIds(ids, trx)
  }

  static async findActiveByNormalizedName(
    name: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return skillQueries.findActiveByNormalizedName(name, trx)
  }

  static async findInactiveByNormalizedName(
    name: string,
    trx?: TransactionClientContract
  ): Promise<Skill[]> {
    return skillQueries.findInactiveByNormalizedName(name, trx)
  }

  static async findByCode(
    skillCode: string,
    trx?: TransactionClientContract
  ): Promise<Skill | null> {
    return skillQueries.findByCode(skillCode, trx)
  }

  static async lockCustomSkillCatalogMutation(trx: TransactionClientContract): Promise<void> {
    return customSkillCatalogMutations.lockCustomSkillCatalogMutation(trx)
  }

  static async reactivateCustomSkill(
    skill: Skill,
    payload: {
      skill_name: string
      category_code: string
      display_type: string
    },
    trx: TransactionClientContract
  ): Promise<Skill> {
    return customSkillCatalogMutations.reactivateCustomSkill(skill, payload, trx)
  }

  static async nextCustomSkillSortOrder(trx: TransactionClientContract): Promise<number> {
    return customSkillCatalogMutations.nextCustomSkillSortOrder(trx)
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
    trx: TransactionClientContract
  ): Promise<Skill> {
    return customSkillCatalogMutations.createCustomSkill(payload, trx)
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
}
