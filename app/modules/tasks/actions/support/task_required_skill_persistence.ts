import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { isSkillCategoryCode } from '#modules/skills/constants/skill_constants'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_framework'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/task_external_dependencies'
import {
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/actions/support/task_required_skill_category_rules'
import TaskRequiredSkillRepository from '#modules/tasks/infra/repositories/task_required_skill_repository'

type RequiredSkill = CreateTaskDTO['required_skills'][number]
type ResolvedRequiredSkill = RequiredSkill & { id: string }

export function assertRequiredSkillsPresent(
  requiredSkills: CreateTaskDTO['required_skills']
): void {
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
  required_public_proficiency_code: string
  is_mandatory: boolean
}[] {
  return requiredSkills.map((skill) => ({
    task_id: taskId,
    skill_id: skill.id,
    required_public_proficiency_code: getCanonicalProficiencyLevelValue(skill.level, 'l4'),
    is_mandatory: skill.is_mandatory ?? true,
  }))
}

async function resolveRequiredSkillsForPersistence(
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TransactionClientContract
): Promise<ResolvedRequiredSkill[]> {
  const resolvedSkills: ResolvedRequiredSkill[] = []

  for (const skill of requiredSkills) {
    const customName = skill.custom_name?.trim()

    if (!customName) {
      resolvedSkills.push(skill)
      continue
    }

    if (!isSkillCategoryCode(skill.category_code)) {
      throw new BusinessLogicException('Nhóm kỹ năng custom không hợp lệ')
    }

    const customSkill = await skillPublicApi.findOrCreateCustomTaskSkill(
      {
        name: customName,
        categoryCode: skill.category_code,
      },
      trx
    )

    resolvedSkills.push({
      ...skill,
      id: customSkill.id,
      custom_name: customSkill.skill_name,
      category_code: customSkill.category_code,
    })
  }

  return resolvedSkills
}

export async function persistTaskRequiredSkills(
  taskId: string,
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TransactionClientContract,
  skillReader: TaskSkillReader
): Promise<void> {
  assertRequiredSkillsPresent(requiredSkills)

  const resolvedRequiredSkills = await resolveRequiredSkillsForPersistence(requiredSkills, trx)
  const skillIds = resolvedRequiredSkills.map((skill) => skill.id)
  const activeSkillIds = new Set(await skillReader.findActiveSkillIds(skillIds, trx))
  const invalidSkill = findInvalidRequiredSkill(resolvedRequiredSkills, activeSkillIds)

  if (invalidSkill) {
    throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
  }

  const activeSkills = await skillPublicApi.findActiveByIds(skillIds, trx)
  const categoryCounts = countTaskRequiredSkillCategories(
    activeSkills.map((skill) => skill.category_code)
  )
  const categoryViolations = getTaskRequiredSkillCategoryViolations(categoryCounts)

  if (categoryViolations.length > 0) {
    throw new BusinessLogicException(formatTaskRequiredSkillCategoryViolations(categoryViolations))
  }

  const rows = resolvedRequiredSkills.map((skill) => {
    const requestedLevelCode = skill.level ?? 'l4'
    const canonicalLevelCode = getCanonicalProficiencyLevelValue(requestedLevelCode, 'l4')

    // Use semantic level IDs when provided, otherwise fall back to legacy mapping
    const resolvedLevel =
      skill.minimum_level_id || skill.target_level_id || skill.assessment_ceiling_level_id
        ? null
        : null

    return {
      task_id: taskId,
      skill_id: skill.id,
      required_public_proficiency_code: canonicalLevelCode,
      minimum_level_id: skill.minimum_level_id ?? resolvedLevel,
      target_level_id: skill.target_level_id ?? resolvedLevel,
      assessment_ceiling_level_id: skill.assessment_ceiling_level_id ?? resolvedLevel,
      requirement_source: (skill.requirement_source ?? 'manual') as
        | 'manual'
        | 'professional_role_prefill'
        | 'template'
        | 'copied_task'
        | 'imported_legacy',
      is_mandatory: skill.is_mandatory ?? true,
      weight: skill.weight ?? 1.0,
      importance: (skill.importance ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
      project_skill_id: skill.project_skill_id ?? null,
      rubric_version_id: skill.rubric_version_id ?? null,
    }
  })

  for (const row of rows) {
    if (!row.minimum_level_id && !row.target_level_id && !row.assessment_ceiling_level_id) {
      const level = await skillPublicApi.mapProficiencyCodeToLevel(
        row.required_public_proficiency_code,
        trx
      )
      row.minimum_level_id = level?.id ?? null
      row.target_level_id = level?.id ?? null
      row.assessment_ceiling_level_id = level?.id ?? null
    }
  }

  await TaskRequiredSkillRepository.createMany(rows, trx)
}
