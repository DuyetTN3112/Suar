import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskRequiredSkillResolver {
  resolveCustomTaskSkill(
    input: { name: string; categoryCode: string },
    trx: TaskTransaction
  ): Promise<{ id: string; skill_name: string; category_code: string } | null>
  findActiveSkillFacts(
    skillIds: string[],
    trx: TaskTransaction
  ): Promise<Array<{ id: string; category_code: string }>>
  mapProficiencyCodeToLevel(code: string, trx: TaskTransaction): Promise<{ id: string } | null>
}

export interface TaskRequiredSkillWriteRow {
  task_id: string
  skill_id: string
  required_public_proficiency_code: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  requirement_source: 'manual' | 'professional_role_prefill' | 'template' | 'copied_task' | 'imported_legacy'
  is_mandatory: boolean
  weight: number
  importance: 'low' | 'medium' | 'high' | 'critical'
  project_skill_id: string | null
  rubric_version_id: string | null
}

export interface TaskRequiredSkillWriter {
  createMany(rows: TaskRequiredSkillWriteRow[], trx: TaskTransaction): Promise<void>
}
