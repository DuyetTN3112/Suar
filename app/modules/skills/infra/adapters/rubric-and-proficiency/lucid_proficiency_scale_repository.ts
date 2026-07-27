import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { ProficiencyScaleRepository } from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/proficiency_scale_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { ProficiencyScaleRepository as Repository } from '#modules/skills/infra/repositories/rubric-and-proficiency/proficiency_scale_repository'

function lucidTransaction(
  transaction: SkillTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidProficiencyScaleRepository implements ProficiencyScaleRepository {
  getActiveScaleWithLevels(transaction?: SkillTransaction) {
    return Repository.getActiveScaleWithLevels(lucidTransaction(transaction))
  }

  findByCode(code: string, transaction?: SkillTransaction) {
    return Repository.findByCode(code, lucidTransaction(transaction))
  }

  findLevelByCode(scaleId: string, code: string, transaction?: SkillTransaction) {
    return Repository.findLevelByCode(scaleId, code, lucidTransaction(transaction))
  }

  findLevelsByIds(ids: string[], transaction?: SkillTransaction) {
    return Repository.findLevelsByIds(ids, lucidTransaction(transaction))
  }

  findLevelById(id: string, transaction?: SkillTransaction) {
    return Repository.findLevelById(id, lucidTransaction(transaction))
  }
}
