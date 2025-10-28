import type { SkillSearchSyncReader } from '#modules/skills/application/ports/skill_search_sync_reader'
import Skill from '#modules/skills/infra/models/skill'

export class LucidSkillSearchSyncReader implements SkillSearchSyncReader {
  async listActiveSkillIds(): Promise<string[]> {
    const skills = await Skill.query().where('is_active', true).select(['id'])
    return skills.map((skill) => skill.id)
  }
}
