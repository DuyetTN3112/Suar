import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SkillRubricRepository } from '#modules/skills/actions/ports/outbound/rubric-and-proficiency/skill_rubric_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { SkillRubricRepository as Repository } from '#modules/skills/infra/repositories/rubric-and-proficiency/skill_rubric_repository'

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

export class LucidSkillRubricRepository implements SkillRubricRepository {
  findSkill(id: string, transaction?: SkillTransaction) {
    return Repository.findSkill(id, lucidTransaction(transaction))
  }

  findActiveSkillByCode(code: string, transaction?: SkillTransaction) {
    return Repository.findActiveSkillByCode(code, lucidTransaction(transaction))
  }

  findActiveSkillByName(name: string, transaction?: SkillTransaction) {
    return Repository.findActiveSkillByName(name, lucidTransaction(transaction))
  }

  findAliasByNormalized(normalizedAlias: string, transaction?: SkillTransaction) {
    return Repository.findAliasByNormalized(normalizedAlias, lucidTransaction(transaction))
  }

  findRubricVersion(id: string, transaction?: SkillTransaction) {
    return Repository.findRubricVersion(id, lucidTransaction(transaction))
  }

  findDraftBySkill(skillId: string, transaction?: SkillTransaction) {
    return Repository.findDraftBySkill(skillId, lucidTransaction(transaction))
  }

  findMaxVersionBySkill(skillId: string, transaction?: SkillTransaction) {
    return Repository.findMaxVersionBySkill(skillId, lucidTransaction(transaction))
  }

  findPublishedBySkill(skillId: string, transaction?: SkillTransaction) {
    return Repository.findPublishedBySkill(skillId, lucidTransaction(transaction))
  }

  createDraftVersion(
    skillId: string,
    version: number,
    createdBy?: string,
    changeSummary?: string,
    transaction?: SkillTransaction
  ) {
    return Repository.createDraftVersion(
      skillId,
      version,
      createdBy,
      changeSummary,
      lucidTransaction(transaction)
    )
  }

  findRubricLevelsByVersion(versionId: string, transaction?: SkillTransaction) {
    return Repository.findRubricLevelsByVersion(versionId, lucidTransaction(transaction))
  }

  createOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>,
    transaction?: SkillTransaction
  ) {
    return Repository.createOrUpdateLevel(
      versionId,
      levelId,
      payload,
      lucidTransaction(transaction)
    )
  }

  publishVersion(versionId: string, effectiveFrom: string, transaction: SkillTransaction) {
    return Repository.publishVersion(
      versionId,
      effectiveFrom,
      requiredLucidTransaction(transaction)
    )
  }

  archivePublishedVersions(
    skillId: string,
    excludeId: string,
    effectiveTo: string,
    transaction: SkillTransaction
  ) {
    return Repository.archivePublishedVersions(
      skillId,
      excludeId,
      effectiveTo,
      requiredLucidTransaction(transaction)
    )
  }

  findVersionsBySkillWithLevels(skillId: string, transaction?: SkillTransaction) {
    return Repository.findVersionsBySkillWithLevels(skillId, lucidTransaction(transaction))
  }
}
