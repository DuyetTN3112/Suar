import Skill from '#modules/skills/infra/models/skill-catalog/skill'

export class LucidSkillSearchDocumentReader {
  async findSkillSearchDocumentRecord(skillId: string) {
    const skill = await Skill.findOrFail(skillId)

    return {
      skillId: skill.id,
      skillCode: skill.skill_code,
      skillName: skill.skill_name,
      categoryCode: skill.category_code,
      displayType: skill.display_type,
      description: skill.description,
      isActive: skill.is_active,
      updatedAt: skill.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
