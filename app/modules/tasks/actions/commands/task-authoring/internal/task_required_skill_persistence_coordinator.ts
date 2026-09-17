import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { isSkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'
import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type {
  TaskExternalDependencies,
  TaskProjectSkillOption,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequiredSkillResolver,
  TaskRequiredSkillWriter,
} from '#modules/tasks/actions/ports/outbound/task_required_skill_persistence'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
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

type RequiredSkill = CreateTaskDTO['required_skills'][number]
type ResolvedRequiredSkill = RequiredSkill & { id: string }

export function assertTaskInheritsBusinessDomains(dto: CreateTaskDTO): void {
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

export async function resolveRequiredSkillsForPersistence(
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

export function assertNoDuplicateResolvedSkills(resolvedSkills: ResolvedRequiredSkill[]): void {
  const seenSkillIds = new Set<string>()
  for (const skill of resolvedSkills) {
    if (seenSkillIds.has(skill.id)) {
      throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
    }
    seenSkillIds.add(skill.id)
  }
}

export async function assertValidSemanticRequirements(
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

export async function normalizeTaskMinimumLevels(
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

export async function assertProjectTaskSkillRanges(
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
