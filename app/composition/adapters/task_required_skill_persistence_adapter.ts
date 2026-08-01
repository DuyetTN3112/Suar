import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import type { SkillCategoryCodeValue } from '#modules/skills/public_contracts/skill_constants'
import type {
  TaskRequiredSkillResolver,
  TaskRequiredSkillWriteRow,
  TaskRequiredSkillWriter,
} from '#modules/tasks/actions/ports/outbound/task_required_skill_persistence'
import * as taskRequiredSkillMutations from '#modules/tasks/infra/repositories/write/task_required_skill_mutations'

export class TaskRequiredSkillResolverAdapter implements TaskRequiredSkillResolver {
  resolveCustomTaskSkill(
    input: { name: string; categoryCode: string },
    trx: TransactionClientContract
  ) {
    return skillPublicApi.findOrCreateCustomTaskSkill(
      { ...input, categoryCode: input.categoryCode as SkillCategoryCodeValue },
      trx
    )
  }

  async findActiveSkillFacts(skillIds: string[], trx: TransactionClientContract) {
    const skills = await skillPublicApi.findActiveByIds(skillIds, trx)
    return skills.map((skill) => ({ id: skill.id, category_code: skill.category_code }))
  }

  async mapProficiencyCodeToLevel(code: string, trx: TransactionClientContract) {
    const level = await skillPublicApi.mapProficiencyCodeToLevel(code, trx)
    return level ? { id: level.id } : null
  }
}

export class TaskRequiredSkillWriterAdapter implements TaskRequiredSkillWriter {
  async createMany(rows: TaskRequiredSkillWriteRow[], trx: TransactionClientContract): Promise<void> {
    await taskRequiredSkillMutations.createMany(rows, trx)
  }
}
