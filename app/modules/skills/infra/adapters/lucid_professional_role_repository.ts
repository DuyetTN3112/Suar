import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CreateProjectProfessionalRoleRecord,
  CreateProjectProfessionalRoleSkillRecord,
  ProfessionalRoleRepository,
  UpdateProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'
import type { SkillTransaction } from '#modules/skills/actions/ports/outbound/skill_transaction'
import { ProfessionalRoleRepository as Repository } from '#modules/skills/infra/repositories/professional_role_repository'

function lucidTransaction(
  transaction: SkillTransaction | undefined
): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

export class LucidProfessionalRoleRepository implements ProfessionalRoleRepository {
  findTemplateByCode(code: string, transaction?: SkillTransaction) {
    return Repository.findTemplateByCode(code, lucidTransaction(transaction))
  }

  findTemplateById(id: string, withSkills = false, transaction?: SkillTransaction) {
    return Repository.findTemplateById(id, withSkills, lucidTransaction(transaction))
  }

  listActiveTemplatesWithSkillDetails(transaction?: SkillTransaction) {
    return Repository.listActiveTemplatesWithSkillDetails(lucidTransaction(transaction))
  }

  findProjectRoleByCode(projectId: string, code: string, transaction?: SkillTransaction) {
    return Repository.findProjectRoleByCode(projectId, code, lucidTransaction(transaction))
  }

  findProjectRoleById(id: string, withSkills = false, transaction?: SkillTransaction) {
    return Repository.findProjectRoleById(id, withSkills, lucidTransaction(transaction))
  }

  listProjectRolesWithSkillDetails(projectId: string, transaction?: SkillTransaction) {
    return Repository.listProjectRolesWithSkillDetails(projectId, lucidTransaction(transaction))
  }

  findProjectRoleSkill(
    projectRoleId: string,
    projectSkillId: string,
    transaction?: SkillTransaction
  ) {
    return Repository.findProjectRoleSkill(
      projectRoleId,
      projectSkillId,
      lucidTransaction(transaction)
    )
  }

  findProjectRoleSkillById(id: string, transaction?: SkillTransaction) {
    return Repository.findProjectRoleSkillById(id, lucidTransaction(transaction))
  }

  createProjectRole(
    payload: CreateProjectProfessionalRoleRecord,
    transaction?: SkillTransaction
  ) {
    return Repository.createProjectRole(payload, lucidTransaction(transaction))
  }

  createProjectRoleSkill(
    payload: CreateProjectProfessionalRoleSkillRecord,
    transaction?: SkillTransaction
  ) {
    return Repository.createProjectRoleSkill(payload, lucidTransaction(transaction))
  }

  updateProjectRoleSkill(
    id: string,
    payload: UpdateProjectProfessionalRoleSkillRecord,
    transaction?: SkillTransaction
  ) {
    return Repository.updateProjectRoleSkill(id, payload, lucidTransaction(transaction))
  }

  deactivateProjectRole(id: string, transaction?: SkillTransaction) {
    return Repository.deactivateProjectRole(id, lucidTransaction(transaction))
  }

  deleteProjectRoleSkill(id: string, transaction?: SkillTransaction) {
    return Repository.deleteProjectRoleSkill(id, lucidTransaction(transaction))
  }

  incrementProjectRoleVersion(id: string, transaction?: SkillTransaction) {
    return Repository.incrementProjectRoleVersion(id, lucidTransaction(transaction))
  }
}
