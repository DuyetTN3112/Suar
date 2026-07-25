import Skill from '#modules/skills/infra/models/skill-catalog/skill'

export class LucidSkillSearchSyncReader {
  async listActiveSkillIds(): Promise<string[]> {
    const skills = await Skill.query().where('is_active', true).select(['id'])
    return skills.map((skill) => skill.id)
  }
}
