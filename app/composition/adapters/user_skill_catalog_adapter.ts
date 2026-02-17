import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import type { SkillCategoryCodeValue } from '#modules/skills/public_contracts/skill_constants'
import type {
  ResolvedUserSkillCatalogEntry,
  ResolveUserSkillCatalogInput,
  UserSkillCatalog,
  UserSkillProfileFact,
} from '#modules/users/actions/ports/outbound/user_skill_catalog'


export class UserSkillCatalogAdapter implements UserSkillCatalog {
  async listActiveSkills(): Promise<UserSkillProfileFact[]> {
    const skills = await skillPublicApi.listActive()
    const facts = await skillPublicApi.findProfileFactsV1(skills.map((skill) => skill.id))
    return facts.map((skill) => ({
      id: skill.id,
      skill_name: skill.name,
      skill_code: skill.code,
      category_code: skill.categoryCode,
      display_type: skill.displayType,
      is_active: skill.isActive,
    }))
  }

  async resolveUserDeclaredSkill(
    input: ResolveUserSkillCatalogInput,
    trx: TransactionClientContract
  ): Promise<ResolvedUserSkillCatalogEntry | null> {
    const providerInput =
      'skillId' in input
        ? input
        : {
            customSkillName: input.customSkillName,
            categoryCode: input.categoryCode as SkillCategoryCodeValue,
          }

    return skillPublicApi.resolveUserDeclaredSkill(providerInput, trx)
  }

  async findProfileFactsByIds(
    skillIds: string[],
    trx?: TransactionClientContract
  ): Promise<UserSkillProfileFact[]> {
    const facts = await skillPublicApi.findProfileFactsV1(skillIds, trx)
    return facts.map((fact) => ({
      id: fact.id,
      skill_name: fact.name,
      skill_code: fact.code,
      category_code: fact.categoryCode,
      display_type: fact.displayType,
      is_active: fact.isActive,
    }))
  }

  async resolveProficiencyLevelId(
    levelCode: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const level = await skillPublicApi.mapProficiencyCodeToLevel(levelCode, trx)
    return level?.id ?? null
  }
}
