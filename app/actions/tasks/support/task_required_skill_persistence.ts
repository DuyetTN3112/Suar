import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import BusinessLogicException from '#exceptions/business_logic_exception'
import TaskRequiredSkillRepository from '#infra/tasks/repositories/task_required_skill_repository'
import type { DatabaseId } from '#types/database'

import { DefaultTaskDependencies } from '../ports/task_external_dependencies_impl.js'

type RequiredSkill = CreateTaskDTO['required_skills'][number]

export function assertRequiredSkillsPresent(requiredSkills: CreateTaskDTO['required_skills']): void {
  if (requiredSkills.length === 0) {
    throw new BusinessLogicException('Task phải có ít nhất 1 kỹ năng yêu cầu')
  }
}

export function findInvalidRequiredSkill(
  requiredSkills: CreateTaskDTO['required_skills'],
  activeSkillIds: Set<DatabaseId>
): RequiredSkill | undefined {
  return requiredSkills.find((skill) => !activeSkillIds.has(skill.id))
}

export function buildTaskRequiredSkillRows(
  taskId: DatabaseId,
  requiredSkills: CreateTaskDTO['required_skills']
): {
  task_id: DatabaseId
  skill_id: DatabaseId
  required_level_code: string
  is_mandatory: boolean
}[] {
  return requiredSkills.map((skill) => ({
    task_id: taskId,
    skill_id: skill.id,
    required_level_code: skill.level,
    is_mandatory: true,
  }))
}

export async function persistTaskRequiredSkills(
  taskId: DatabaseId,
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TransactionClientContract
): Promise<void> {
  assertRequiredSkillsPresent(requiredSkills)

  const skillIds = requiredSkills.map((skill) => skill.id)
  const activeSkillIds = new Set(
    await DefaultTaskDependencies.skill.findActiveSkillIds(skillIds, trx)
  )
  const invalidSkill = findInvalidRequiredSkill(requiredSkills, activeSkillIds)

  if (invalidSkill) {
    throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
  }

  await TaskRequiredSkillRepository.createMany(buildTaskRequiredSkillRows(taskId, requiredSkills), trx)
}
