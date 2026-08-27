import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserSkillRecord } from '#modules/users/types/user_records'

/** Query helper that loads catalog facts and builds the user-skill read projection. */
export async function hydrateUserSkillProfileRecords(
  userSkills: UserSkillRecord[],
  catalog: UserSkillCatalog,
  transaction?: UserTransaction
): Promise<UserSkillRecord[]> {
  const skillIds = [...new Set(userSkills.map((userSkill) => userSkill.skill_id))]
  const facts = await catalog.findProfileFactsByIds(skillIds, transaction)
  const factById = new Map(facts.map((fact) => [fact.id, fact]))

  return userSkills.map((userSkill) => {
    const fact = factById.get(userSkill.skill_id)
    if (!fact) return userSkill

    return {
      ...userSkill,
      skill: {
        skill_name: fact.skill_name,
        skill_code: fact.skill_code,
        category_code: fact.category_code,
        display_type: fact.display_type,
        is_active: fact.is_active,
      },
    }
  })
}
