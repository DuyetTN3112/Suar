import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import type {
  TaskSkillOption,
  TaskSkillReader,
} from '#modules/tasks/actions/ports/task_external_dependencies'

export class MonolithTaskSkillReader implements TaskSkillReader {
  async listActiveSkills(): Promise<TaskSkillOption[]> {
    const skills = await skillPublicApi.listActive()

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.skill_name,
      category_code: typeof skill.category_code === 'string' ? skill.category_code : null,
    }))
  }

  async listActiveProficiencyLevels(): Promise<{ value: string; label: string }[]> {
    return skillPublicApi.listActiveProficiencyLevels()
  }

  async findActiveSkillIds(skillIds: string[], trx?: TransactionClientContract): Promise<string[]> {
    const skills = await skillPublicApi.findActiveByIds(skillIds, trx)
    return skills.map((skill) => skill.id)
  }
}
