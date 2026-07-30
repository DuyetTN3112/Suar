import { DateTime } from 'luxon'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi, type AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { isSkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'
import {
  ensureTaskCreationPreconditions,
  resolveTaskStatusForCreation,
} from '#modules/tasks/actions/commands/task-authoring/internal/create_task_preconditions'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment'
import { synchronizeTaskAssignmentContractForTask } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment_contract'
import { safeTaskAuthoringAuditValues } from '#modules/tasks/actions/commands/task-authoring/internal/task_authoring_audit_values'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import { buildCreateTaskPersistencePayload } from '#modules/tasks/actions/mappers/task-authoring/task_create_persistence_mapper'
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
  type TaskRequiredSkillCategoryPolicy,
} from '#modules/tasks/domain/task-requirements/task_required_skill_category_rules'
import {
  getTaskRequirementLevelConfigurationViolation,
  getTaskRequirementValueViolation,
} from '#modules/tasks/domain/task-requirements/task_skill_requirement_rules'
import type { TaskProjectSkillOption } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { canCreateTaskInStatus } from '#modules/tasks/domain/task-status/task_status_rules'
import type { TaskAuthoringSummaryRecord, TaskRecord } from '#modules/tasks/types/task_records'

type EnsureTaskCreationPreconditionsFn = typeof ensureTaskCreationPreconditions
type ResolveTaskStatusForCreationFn = typeof resolveTaskStatusForCreation
type PersistTaskRequiredSkillsFn = typeof persistTaskRequiredSkills
type CreateAuditLogFactory = (execCtx: TaskActionContext) => {
  handle(data: AuditLogData, trx: TaskTransaction): Promise<boolean>
}
type NowFactory = () => DateTime

type RequiredSkill = CreateTaskDTO['required_skills'][number]
type ResolvedRequiredSkill = RequiredSkill & { id: string }

function assertTaskInheritsBusinessDomains(dto: CreateTaskDTO): void {
  if (dto.business_domain || dto.domain_tags.length > 0) {
    throw new ValidationException(
      'Lĩnh vực của Task được kế thừa từ Project; không được khai báo riêng trong Task'
    )
  }
}

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

function assertNoDuplicateResolvedSkills(resolvedSkills: ResolvedRequiredSkill[]): void {
  const seenSkillIds = new Set<string>()
  for (const skill of resolvedSkills) {
    if (seenSkillIds.has(skill.id)) {
      throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
    }
    seenSkillIds.add(skill.id)
  }
}

async function assertValidSemanticRequirements(
  resolvedSkills: ResolvedRequiredSkill[],
  skillReader: TaskExternalDependencies['skill']
): Promise<void> {
  const proficiencyLevelIds = [
    ...new Set(
      resolvedSkills.flatMap((skill) =>
        [skill.minimum_level_id, skill.target_level_id, skill.assessment_ceiling_level_id].filter(
          (value): value is string => Boolean(value)
        )
      )
    ),
  ]
  const levels =
    proficiencyLevelIds.length === 0
      ? []
      : await skillReader.findProficiencyLevelsByIds(proficiencyLevelIds)

  for (const skill of resolvedSkills) {
    const rubricVersionId = skill.rubric_version_id?.trim()
    if (skill.rubric_version_id !== undefined && !rubricVersionId) {
      throw new ValidationException('Rubric version ID cannot be empty')
    }
    const minimumLevelId = skill.minimum_level_id ?? null
    const targetLevelId = skill.target_level_id ?? null
    const assessmentCeilingLevelId = skill.assessment_ceiling_level_id ?? null
    const levelViolation = getTaskRequirementLevelConfigurationViolation({
      minimumLevelId,
      targetLevelId,
      assessmentCeilingLevelId,
      levels,
    })
    if (levelViolation?.startsWith('Proficiency level not found:')) {
      throw new NotFoundException(levelViolation)
    }
    if (levelViolation) {
      throw new ValidationException(levelViolation)
    }

    const hasSemanticContract = Boolean(
      minimumLevelId || targetLevelId || assessmentCeilingLevelId || rubricVersionId
    )
    if (hasSemanticContract) {
      const valueViolation = getTaskRequirementValueViolation({
        isMandatory: skill.is_mandatory ?? true,
        minimumLevelId,
        weight: skill.weight ?? 1,
      })
      if (valueViolation) {
        throw new ValidationException(valueViolation)
      }
    }

    if (rubricVersionId) {
      const rubricVersion = await skillReader.findRubricVersion(rubricVersionId)
      if (!rubricVersion) {
        throw new NotFoundException('Rubric version not found')
      }
      if (rubricVersion.skillId !== skill.id) {
        throw new ValidationException('Rubric version does not belong to the specified skill')
      }
    }
  }
}

async function normalizeTaskMinimumLevels(
  requiredSkills: ResolvedRequiredSkill[],
  resolver: TaskRequiredSkillResolver,
  trx: TaskTransaction
): Promise<ResolvedRequiredSkill[]> {
  const normalized: ResolvedRequiredSkill[] = []
  for (const skill of requiredSkills) {
    if (skill.target_level_id || skill.assessment_ceiling_level_id) {
      throw new ValidationException(
        'Task chỉ được khai báo mức kỹ năng tối thiểu; không được đặt mức mục tiêu hoặc trần đánh giá hồ sơ'
      )
    }
    const requiredCode = getCanonicalProficiencyLevelValue(skill.level, '')
    if (!requiredCode) {
      throw new ValidationException(
        'Phải chọn mức kỹ năng tối thiểu cho từng kỹ năng của task'
      )
    }
    const mappedLevel = await resolver.mapProficiencyCodeToLevel(requiredCode, trx)
    if (!mappedLevel) {
      throw new NotFoundException(`Không tìm thấy level kỹ năng: ${requiredCode.toUpperCase()}`)
    }
    if (skill.minimum_level_id && skill.minimum_level_id !== mappedLevel.id) {
      throw new ValidationException(
        'Mức level của task không khớp với mức tối thiểu được gửi kèm'
      )
    }
    const {
      target_level_id: _targetLevelId,
      assessment_ceiling_level_id: _assessmentCeilingLevelId,
      ...skillWithoutProfileAssessmentBounds
    } = skill
    normalized.push({
      ...skillWithoutProfileAssessmentBounds,
      level: requiredCode,
      minimum_level_id: mappedLevel.id,
    })
  }
  return normalized
}

async function assertProjectTaskSkillRanges(
  projectId: string,
  requiredSkills: ResolvedRequiredSkill[],
  skillReader: TaskExternalDependencies['skill']
): Promise<void> {
  const projectSkills = await skillReader.listProjectTaskSkills(projectId)
  const projectSkillById = new Map(projectSkills.map((projectSkill) => [projectSkill.projectSkillId, projectSkill]))
  const levelIds = [
    ...new Set(
      requiredSkills.flatMap((skill) => {
        const projectSkill = skill.project_skill_id
          ? projectSkillById.get(skill.project_skill_id)
          : undefined
        return [
          skill.minimum_level_id,
          projectSkill?.minimumTaskRequirementLevelId,
          projectSkill?.maximumTaskRequirementLevelId,
        ].filter((id): id is string => Boolean(id))
      })
    ),
  ]
  const levels = await skillReader.findProficiencyLevelsByIds(levelIds)
  const levelById = new Map(levels.map((level) => [level.id, level]))

  for (const skill of requiredSkills) {
    if (skill.custom_name) {
      throw new ValidationException(
        'Kỹ năng của task phải được cấu hình tại Project trước khi sử dụng'
      )
    }
    if (!skill.project_skill_id) {
      throw new ValidationException(
        'Kỹ năng của task phải thuộc danh mục kỹ năng của Project'
      )
    }
    const projectSkill = projectSkillById.get(skill.project_skill_id)
    assertProjectSkillCanBeRequired(projectSkill, skill)

    const requiredLevel = levelById.get(skill.minimum_level_id ?? '')
    const minimumLevel = levelById.get(projectSkill.minimumTaskRequirementLevelId ?? '')
    const maximumLevel = levelById.get(projectSkill.maximumTaskRequirementLevelId ?? '')
    if (!requiredLevel || !minimumLevel || !maximumLevel) {
      throw new ValidationException('Khoảng level kỹ năng của Project chưa hợp lệ')
    }
    if (
      requiredLevel.scaleId !== minimumLevel.scaleId ||
      requiredLevel.scaleId !== maximumLevel.scaleId ||
      requiredLevel.ordinal < minimumLevel.ordinal ||
      requiredLevel.ordinal > maximumLevel.ordinal
    ) {
      throw new ValidationException(
        `Mức ${getCanonicalProficiencyLevelValue(skill.level, '').toUpperCase()} của ${projectSkill.name} nằm ngoài khoảng level đã cấu hình tại Project`
      )
    }
  }
}

function assertProjectSkillCanBeRequired(
  projectSkill: TaskProjectSkillOption | undefined,
  skill: ResolvedRequiredSkill
): asserts projectSkill is TaskProjectSkillOption {
  if (!projectSkill || projectSkill.id !== skill.id) {
    throw new ValidationException('Kỹ năng task không thuộc Project hiện tại')
  }
  if (!projectSkill.isActive || !projectSkill.isSelectableForTasks) {
    throw new ValidationException('Kỹ năng này không được phép dùng cho task tại Project')
  }
  if (
    !projectSkill.minimumTaskRequirementLevelId ||
    !projectSkill.maximumTaskRequirementLevelId
  ) {
    throw new ValidationException(
      `Kỹ năng ${projectSkill.name} chưa được cấu hình khoảng level tại Project`
    )
  }
}

export async function persistTaskRequiredSkills(
  taskId: string,
  projectId: string,
  requiredSkills: CreateTaskDTO['required_skills'],
  trx: TaskTransaction,
  skillReader: TaskExternalDependencies['skill'],
  resolver: TaskRequiredSkillResolver,
  writer: TaskRequiredSkillWriter,
  categoryPolicy?: TaskRequiredSkillCategoryPolicy
): Promise<void> {
  assertRequiredSkillsPresent(requiredSkills)

  const resolvedRequiredSkills = await resolveRequiredSkillsForPersistence(
    requiredSkills,
    trx,
    resolver
  )
  const normalizedRequiredSkills = await normalizeTaskMinimumLevels(
    resolvedRequiredSkills,
    resolver,
    trx
  )
  assertNoDuplicateResolvedSkills(normalizedRequiredSkills)
  const skillIds = normalizedRequiredSkills.map((skill) => skill.id)
  const activeSkillIds = new Set(await skillReader.findActiveSkillIds(skillIds, trx))
  const invalidSkill = findInvalidRequiredSkill(normalizedRequiredSkills, activeSkillIds)
  if (invalidSkill) {
    throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
  }

  const activeSkills = await resolver.findActiveSkillFacts(skillIds, trx)
  const categoryCounts = countTaskRequiredSkillCategories(
    activeSkills.map((skill) => skill.category_code)
  )
  const categoryViolations = getTaskRequiredSkillCategoryViolations(categoryCounts, categoryPolicy)
  if (categoryViolations.length > 0) {
    throw new BusinessLogicException(
      formatTaskRequiredSkillCategoryViolations(categoryViolations, categoryPolicy)
    )
  }

  await assertValidSemanticRequirements(normalizedRequiredSkills, skillReader)
  await assertProjectTaskSkillRanges(projectId, normalizedRequiredSkills, skillReader)

  const rows = normalizedRequiredSkills.map((skill) => {
    const canonicalLevelCode = getCanonicalProficiencyLevelValue(skill.level, '')
    return {
      task_id: taskId,
      skill_id: skill.id,
      required_public_proficiency_code: canonicalLevelCode,
      minimum_level_id: skill.minimum_level_id ?? null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
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
      rubric_version_id: skill.rubric_version_id?.trim() || null,
      proficiency_level_id: skill.minimum_level_id ?? null,
    }
  })

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
  assertTaskInheritsBusinessDomains(input.dto)
  const projectBusinessDomains = await externalDependencies.project.findProjectBusinessDomains(
    input.dto.project_id,
    input.trx
  )
  const selectedStatus = await deps.resolveTaskStatusForCreation(input.dto, input.trx, {
    taskStatusRepository,
  })
  const requestedAuthoringIntent = input.dto.authoring.intent
  const authoringIntent =
    input.dto.authoring.explicit &&
    (requestedAuthoringIntent === 'publish' || requestedAuthoringIntent === 'save_draft')
      ? requestedAuthoringIntent
      : undefined
  const taskCreationStatusContext = {
    ...(input.dto.assigned_to === undefined ? {} : { assigneeId: input.dto.assigned_to }),
    ...(authoringIntent ? { authoringIntent } : {}),
  }
  enforcePolicy(canCreateTaskInStatus(selectedStatus, taskCreationStatusContext))
  const resolvedDueDate = input.dto.due_date ?? deps.getNow().plus({ days: 7 })

  const sprintDecision = input.dto.project_sprint_id
    ? await externalDependencies.sprint.validateAssignment({
        context: input.execCtx,
        organizationId: input.dto.organization_id,
        projectId: input.dto.project_id,
        sprintId: input.dto.project_sprint_id,
        transaction: input.trx,
      })
    : { allowed: true as const }
  if (!sprintDecision.allowed) {
    enforcePolicy(PR.deny(sprintDecision.reason ?? 'Task sprint assignment is not allowed', 'BUSINESS_RULE'))
  }

  const result = await (deps.taskRepository ?? externalDependencies.taskCommands).create(
    buildCreateTaskPersistencePayload(
      input.dto,
      input.userId,
      selectedStatus,
      resolvedDueDate,
      projectBusinessDomains
    ),
    input.trx
  )

  await externalDependencies.sprint.recordInitialAssignment({
    organizationId: input.dto.organization_id,
    projectId: input.dto.project_id,
    taskId: result.task.id,
    sprintId: input.dto.project_sprint_id ?? null,
    entryReason: input.dto.project_sprint_id
      ? sprintDecision.sprintStatus === 'active' ? 'scope_change' : 'planned'
      : 'created_in_backlog',
    addedAfterStart: sprintDecision.sprintStatus === 'active',
    actorId: input.userId,
  }, input.trx)

  if (input.dto.required_skills.length > 0) {
    await deps.persistTaskRequiredSkills(
      result.task.id,
      input.dto.project_id,
      input.dto.required_skills,
      input.trx,
      externalDependencies.skill,
      requiredSkillPersistence.resolver,
      requiredSkillPersistence.writer
    )
  }

  let authoringSummary: TaskAuthoringSummaryRecord | undefined
  if (input.dto.authoring.explicit) {
    if (!externalDependencies.authoring) {
      throw new DependencyUnavailableException('task_authoring', 'persist_initial_bundle')
    }
    authoringSummary = await externalDependencies.authoring.persistInitial({
      taskId: result.task.id,
      actorId: input.userId,
      dto: input.dto,
      trx: input.trx,
    })
  }
  if (input.dto.assigned_to !== undefined) {
    const assignment = await synchronizeTaskAssignment(
      {
        taskId: result.task.id,
        assigneeId: input.dto.assigned_to,
        assignedBy: input.userId,
        taskRowAlreadySynchronized: true,
        enforceSkillEligibility: false,
      },
      input.trx,
      externalDependencies.assignments,
      externalDependencies.lifecycle,
      externalDependencies.skill
    )
    if (assignment) {
      await synchronizeTaskAssignmentContractForTask(
        assignment,
        result.task,
        input.trx,
        externalDependencies
      )
    }
  }
  await deps.createAuditLogFactory(input.execCtx).handle(
    {
      user_id: input.userId,
      action: AuditAction.CREATE,
      entity_type: EntityType.TASK,
      entity_id: result.task.id,
      new_values: authoringSummary
        ? { ...result.auditValues, authoring: safeTaskAuthoringAuditValues(authoringSummary) }
        : result.auditValues,
    },
    input.trx
  )

  return authoringSummary ? { ...result.task, authoring: authoringSummary } : result.task
}
