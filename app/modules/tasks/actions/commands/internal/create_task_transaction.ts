import { DateTime } from 'luxon'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_framework'
import { isSkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#modules/tasks/actions/commands/internal/create_task_preconditions'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import { buildCreateTaskPersistencePayload } from '#modules/tasks/actions/mapper/task_create_persistence_mapper'
import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_command_repository_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequiredSkillResolver,
  TaskRequiredSkillWriter,
} from '#modules/tasks/actions/ports/outbound/task_required_skill_persistence'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/domain/task_required_skill_category_rules'
import type { TaskRecord } from '#modules/tasks/types/task_records'

type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData, trx: TaskTransaction): Promise<boolean>
}
type NowFactory = () => DateTime

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

async function resolveRequiredSkillsForPersistence(
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TaskTransaction,
  resolver: TaskRequiredSkillResolver
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

    const customSkill = await resolver.resolveCustomTaskSkill(
      {
        name: customName,
        categoryCode: skill.category_code,
      },
      trx
    )
    if (!customSkill) {
      throw new BusinessLogicException('Kỹ năng custom trùng với một mục catalog đã bị vô hiệu hóa')
    }
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
  trx: TaskTransaction,
  skillReader: TaskExternalDependencies['skill'],
  resolver: TaskRequiredSkillResolver,
  writer: TaskRequiredSkillWriter
): Promise<void> {
  assertRequiredSkillsPresent(requiredSkills)

  const resolvedRequiredSkills = await resolveRequiredSkillsForPersistence(
    requiredSkills,
    trx,
    resolver
  )
  const skillIds = resolvedRequiredSkills.map((skill) => skill.id)
  const activeSkillIds = new Set(await skillReader.findActiveSkillIds(skillIds, trx))
  const invalidSkill = findInvalidRequiredSkill(resolvedRequiredSkills, activeSkillIds)
  if (invalidSkill) {
    throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
  }

  const activeSkills = await resolver.findActiveSkillFacts(skillIds, trx)
  const categoryCounts = countTaskRequiredSkillCategories(
    activeSkills.map((skill) => skill.category_code)
  )
  const categoryViolations = getTaskRequiredSkillCategoryViolations(categoryCounts)
  if (categoryViolations.length > 0) {
    throw new BusinessLogicException(formatTaskRequiredSkillCategoryViolations(categoryViolations))
  }

  const rows = resolvedRequiredSkills.map((skill) => {
    const canonicalLevelCode = getCanonicalProficiencyLevelValue(skill.level ?? 'l4', 'l4')
    return {
      task_id: taskId,
      skill_id: skill.id,
      required_public_proficiency_code: canonicalLevelCode,
      minimum_level_id: skill.minimum_level_id ?? null,
      target_level_id: skill.target_level_id ?? null,
      assessment_ceiling_level_id: skill.assessment_ceiling_level_id ?? null,
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
      const level = await resolver.mapProficiencyCodeToLevel(
        row.required_public_proficiency_code,
        trx
      )
      row.minimum_level_id = level?.id ?? null
      row.target_level_id = level?.id ?? null
      row.assessment_ceiling_level_id = level?.id ?? null
    }
  }

  await writer.createMany(rows, trx)
}

export interface CreateTaskPersistenceInput {
  execCtx: TaskActionContext
  dto: CreateTaskDTO
  userId: string
  trx: TaskTransaction
  externalDependencies: TaskExternalDependencies
}

export interface CreateTaskPersistenceDependencies {
  taskRepository?: TaskCommandRepositoryPort
  ensureTaskCreationPreconditions: EnsureTaskCreationPreconditionsFn
  resolveTaskStatusForCreation: ResolveTaskStatusForCreationFn
  persistTaskRequiredSkills: PersistTaskRequiredSkillsFn
  createAuditLogFactory: CreateAuditLogFactory
  getNow: NowFactory
}

const defaultDependencies: CreateTaskPersistenceDependencies = {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
  persistTaskRequiredSkills,
  createAuditLogFactory: (execCtx: TaskActionContext) => ({
    handle: (data: AuditLogData, trx: TaskTransaction) =>
      auditPublicApi.log(data, execCtx, { trx, critical: true }),
  }),
  getNow: () => DateTime.now(),
}

export async function persistTaskCreateWithinTransaction(
  input: CreateTaskPersistenceInput,
  dependencies: Partial<CreateTaskPersistenceDependencies> = {}
): Promise<TaskRecord> {
  const deps = {
    ...defaultDependencies,
    ...dependencies,
  }

  const externalDependencies = input.externalDependencies
  const requiredSkillPersistence = externalDependencies.requiredSkillPersistence
  const taskIdentityRepository = externalDependencies.taskIdentityRepository
  const taskStatusRepository = externalDependencies.taskStatusRepository
  if (!requiredSkillPersistence || !taskIdentityRepository || !taskStatusRepository) {
    throw new DependencyUnavailableException('task_creation_persistence', 'resolve_capabilities')
  }

  await deps.ensureTaskCreationPreconditions(input.userId, input.dto, input.trx, {
    externalDependencies,
    taskRepository: taskIdentityRepository,
    taskStatusRepository,
  })
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx, {
    taskStatusRepository,
  })
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const result = await (deps.taskRepository ?? externalDependencies.taskCommands).create(
    buildCreateTaskPersistencePayload(input.dto, input.userId, selectedStatus, resolvedDueDate),
    input.trx
  )

  await deps.persistTaskRequiredSkills(
    result.task.id,
    input.dto.required_skills,
    input.trx,
    externalDependencies.skill,
    requiredSkillPersistence.resolver,
    requiredSkillPersistence.writer
  )
  await deps.createAuditLogFactory(input.execCtx).handle(
    {
      user_id: input.userId,
      action: AuditAction.CREATE,
      entity_type: EntityType.TASK,
      entity_id: result.task.id,
      new_values: result.auditValues,
    },
    input.trx
  )

  return result.task
}
