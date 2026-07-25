import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CreateCustomSkillRecord,
  ReactivateCustomSkillRecord,
  SkillCatalogRepository,
  SkillRecord,
} from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import type Skill from '#modules/skills/infra/models/skill-catalog/skill'
import SkillRepository from '#modules/skills/infra/repositories/skill-catalog/skill_repository'

function lucidTransaction(
  transaction: SkillTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

function requiredLucidTransaction(
  transaction: SkillTransaction
): TransactionClientContract {
  return transaction as TransactionClientContract
}

export class LucidSkillCatalogRepository implements SkillCatalogRepository {
  async listActive() {
    return SkillRepository.activeSkills()
  }

  async listActiveWithPublishedRubrics() {
    return SkillRepository.activeSkillsWithPublishedRubrics()
  }

  async searchActiveWithPublishedRubrics(keyword: string, limit?: number) {
    return SkillRepository.searchActiveSkillsWithPublishedRubrics(keyword, limit)
  }

  findActiveSkillIdsByCategoryCodes(categoryCodes: string[]) {
    return SkillRepository.findActiveSkillIdsByCategoryCodes(categoryCodes)
  }

  findSkillIdsByCategoryCodes(categoryCodes: string[]) {
    return SkillRepository.findSkillIdsByCategoryCodes(categoryCodes)
  }

  getSpiderChartSkillIds(transaction?: SkillTransaction) {
    return SkillRepository.getSpiderChartSkillIds(lucidTransaction(transaction))
  }

  findActiveByIds(ids: string[], transaction?: SkillTransaction) {
    return SkillRepository.findActiveByIds(ids, lucidTransaction(transaction))
  }

  findByIds(ids: string[], transaction?: SkillTransaction) {
    return SkillRepository.findByIds(ids, lucidTransaction(transaction))
  }

  findActiveByIdsWithPublishedRubrics(ids: string[], transaction?: SkillTransaction) {
    return SkillRepository.findActiveByIdsWithPublishedRubrics(
      ids,
      lucidTransaction(transaction)
    )
  }

  findActiveByNormalizedName(name: string, transaction?: SkillTransaction) {
    return SkillRepository.findActiveByNormalizedName(name, lucidTransaction(transaction))
  }

  findInactiveByNormalizedName(name: string, transaction?: SkillTransaction) {
    return SkillRepository.findInactiveByNormalizedName(name, lucidTransaction(transaction))
  }

  findByCode(skillCode: string, transaction?: SkillTransaction) {
    return SkillRepository.findByCode(skillCode, lucidTransaction(transaction))
  }

  lockCustomSkillCatalogMutation(transaction: SkillTransaction) {
    return SkillRepository.lockCustomSkillCatalogMutation(requiredLucidTransaction(transaction))
  }

  reactivateCustomSkill(
    skill: SkillRecord,
    payload: ReactivateCustomSkillRecord,
    transaction: SkillTransaction
  ) {
    return SkillRepository.reactivateCustomSkill(
      skill as Skill,
      payload,
      requiredLucidTransaction(transaction)
    )
  }

  nextCustomSkillSortOrder(transaction: SkillTransaction) {
    return SkillRepository.nextCustomSkillSortOrder(requiredLucidTransaction(transaction))
  }

  createCustomSkill(payload: CreateCustomSkillRecord, transaction: SkillTransaction) {
    return SkillRepository.createCustomSkill(payload, requiredLucidTransaction(transaction))
  }
}
