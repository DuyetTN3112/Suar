import type {
  SkillActiveSkillOption,
  SkillExternalDependencies,
  SkillReader,
} from './skill_external_dependencies.js'

import SkillRepository from '#modules/skills/infra/repositories/skill_repository'

export class InfraSkillReader implements SkillReader {
  async listActiveSkills(): Promise<SkillActiveSkillOption[]> {
    const skills = await SkillRepository.activeSkills()

    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
    }))
  }
}

export const DefaultSkillDependencies: SkillExternalDependencies = {
  skill: new InfraSkillReader(),
}
