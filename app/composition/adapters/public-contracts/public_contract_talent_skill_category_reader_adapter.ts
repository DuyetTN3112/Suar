import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'
import type { TalentSkillCategoryReader } from '#modules/users/actions/ports/outbound/talent_skill_category_reader'

export class PublicContractTalentSkillCategoryReaderAdapter implements TalentSkillCategoryReader {
  async resolveActiveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<string[]> {
    const skills = await skillPublicApi.resolveActiveSkillIdsByCategoryCodes(categoryCodes)
    return skills.map((skill) => skill.id)
  }
}
