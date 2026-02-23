import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CreateProjectSkillRecord,
  ProjectSkillRepository,
  UpdateProjectSkillRecord,
} from '#modules/skills/actions/ports/outbound/project_skill_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { ProjectSkillRepository as Repository } from '#modules/skills/infra/repositories/project_skill_repository'

function lucidTransaction(
  transaction: SkillTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidProjectSkillRepository implements ProjectSkillRepository {
  findSkill(id: string, transaction?: SkillTransaction) {
    return Repository.findSkill(id, lucidTransaction(transaction))
  }

  findActiveSkill(id: string, transaction?: SkillTransaction) {
    return Repository.findActiveSkill(id, lucidTransaction(transaction))
  }

  findProjectSkill(projectId: string, skillId: string, transaction?: SkillTransaction) {
    return Repository.findProjectSkill(projectId, skillId, lucidTransaction(transaction))
  }

  findProjectSkillById(id: string, transaction?: SkillTransaction) {
    return Repository.findProjectSkillById(id, lucidTransaction(transaction))
  }

  listProjectSkills(projectId: string, transaction?: SkillTransaction) {
    return Repository.listProjectSkills(projectId, lucidTransaction(transaction))
  }

  findRubricVersion(id: string, transaction?: SkillTransaction) {
    return Repository.findRubricVersion(id, lucidTransaction(transaction))
  }

  createProjectSkill(payload: CreateProjectSkillRecord, transaction?: SkillTransaction) {
    return Repository.createProjectSkill(payload, lucidTransaction(transaction))
  }

  updateProjectSkill(
    id: string,
    payload: UpdateProjectSkillRecord,
    transaction?: SkillTransaction
  ) {
    return Repository.updateProjectSkill(id, payload, lucidTransaction(transaction))
  }
}
