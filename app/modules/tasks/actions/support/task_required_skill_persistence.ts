import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
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
    required_level_code: skill.level,
    is_mandatory: true,
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

  await TaskRequiredSkillRepository.createMany(buildTaskRequiredSkillRows(taskId, requiredSkills), trx)
}
