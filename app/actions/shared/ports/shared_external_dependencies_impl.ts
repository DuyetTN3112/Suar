import SkillRepository from '#infra/skills/repositories/skill_repository'

import type {
  SharedActiveSkillOption,
  SharedExternalDependencies,
  SharedSkillReader,
} from './shared_external_dependencies.js'

export class InfraSharedSkillReader implements SharedSkillReader {
  async listActiveSkills(): Promise<SharedActiveSkillOption[]> {
    const skills = await SkillRepository.activeSkills()

    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code ?? null,
    }))
  }
}

export const DefaultSharedDependencies: SharedExternalDependencies = {
  skill: new InfraSharedSkillReader(),
}
