import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { skillPublicApi } from '#modules/skills/actions/services/skill_public_api'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import TaskRequiredSkillRepository from '#modules/tasks/infra/repositories/task_required_skill_repository'


type RequiredSkill = CreateTaskDTO['required_skills'][number]

export function assertRequiredSkillsPresent(requiredSkills: CreateTaskDTO['required_skills']): void {
  if (requiredSkills.length === 0) {
    throw new BusinessLogicException('Task phải có ít nhất 1 kỹ năng yêu cầu')
  }
}

export function findInvalidRequiredSkill(
  requiredSkills: CreateTaskDTO['required_skills'],
  activeSkillIds: Set<string>
): RequiredSkill | undefined {
  return requiredSkills.find((skill) => !activeSkillIds.has(skill.id))
}

export function buildTaskRequiredSkillRows(
  taskId: string,
  requiredSkills: CreateTaskDTO['required_skills']
): {
  task_id: string
  skill_id: string
  required_level_code: string
  is_mandatory: boolean
}[] {
  return requiredSkills.map((skill) => ({
    task_id: taskId,
    skill_id: skill.id,
    required_level_code: skill.level ?? 'junior',
    is_mandatory: skill.is_mandatory ?? true,
  }))
}

export async function persistTaskRequiredSkills(
  taskId: string,
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TransactionClientContract,
  skillReader: TaskSkillReader
): Promise<void> {
  assertRequiredSkillsPresent(requiredSkills)

  const skillIds = requiredSkills.map((skill) => skill.id)
  const activeSkillIds = new Set(await skillReader.findActiveSkillIds(skillIds, trx))
  const invalidSkill = findInvalidRequiredSkill(requiredSkills, activeSkillIds)

  if (invalidSkill) {
    throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
  }

  const activeScale = await skillPublicApi.proficiencyScale.getActiveScaleWithLevels(trx)
  const levelMap: Record<string, string> = {}
  if (activeScale) {
    for (const lvl of activeScale.levels) {
      levelMap[lvl.code] = lvl.id
    }
  }

  const rows = requiredSkills.map((skill) => {
    const legacyLevelCode = skill.level ?? 'junior'
    const levelId = levelMap[legacyLevelCode] ?? null

    // Use semantic level IDs when provided, otherwise fall back to legacy mapping
    const minimumLevelId = skill.minimum_level_id ?? levelId
    const targetLevelId = skill.target_level_id ?? levelId
    const assessmentCeilingLevelId = skill.assessment_ceiling_level_id ?? levelId

    return {
      task_id: taskId,
      skill_id: skill.id,
      required_level_code: legacyLevelCode,
      minimum_level_id: minimumLevelId,
      target_level_id: targetLevelId,
      assessment_ceiling_level_id: assessmentCeilingLevelId,
      requirement_source: (skill.requirement_source ?? 'manual') as 'manual' | 'professional_role_prefill' | 'template' | 'copied_task' | 'imported_legacy',
      is_mandatory: skill.is_mandatory ?? true,
      weight: skill.weight ?? 1.0,
      importance: (skill.importance ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
      project_skill_id: skill.project_skill_id ?? null,
      rubric_version_id: skill.rubric_version_id ?? null,
    }
  })

  await TaskRequiredSkillRepository.createMany(rows, trx)
}
