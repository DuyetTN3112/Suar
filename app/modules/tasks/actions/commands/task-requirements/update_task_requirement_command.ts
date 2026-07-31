import AppException from '#modules/errors/public_contracts/application_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementImportance,
  TaskRequirementReader,
  TaskRequirementRecord,
  TaskRequirementWriter,
  UpdateTaskRequirementRecord,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskSearchProjectionInvalidationStager } from '#modules/tasks/actions/ports/outbound/task_search_projection_invalidation_stager'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  getTaskRequirementLevelConfigurationViolation,
  getTaskRequirementValueViolation,
} from '#modules/tasks/domain/task_skill_requirement_rules'

export interface UpdateTaskRequirementInput {
  requirementId: string
  minimumLevelId?: string | null
  targetLevelId?: string | null
  assessmentCeilingLevelId?: string | null
  rubricVersionId?: string | null
  isMandatory?: boolean
  importance?: TaskRequirementImportance
  weight?: number
  requirementNotes?: string | null
}

export default class UpdateTaskRequirementCommand {
  constructor(
    private readonly requirements: TaskRequirementReader,
    private readonly requirementWriter: TaskRequirementWriter,
    private readonly skills: TaskSkillReader,
    private readonly transactions: TaskTransactionRunner,
    private readonly searchProjectionInvalidation?: TaskSearchProjectionInvalidationStager
  ) {}

  async execute(input: UpdateTaskRequirementInput): Promise<TaskRequirementRecord> {
    return this.transactions.run(async (transaction) => {
      const requirement = await this.requirements.findById(input.requirementId, transaction)
      if (!requirement) {
        throw new NotFoundException('Task skill requirement not found')
      }

      const minimumLevelId =
        input.minimumLevelId !== undefined ? input.minimumLevelId : requirement.minimum_level_id
      if (input.targetLevelId || input.assessmentCeilingLevelId) {
        throw new ValidationException(
          'Task chỉ có mức kỹ năng tối thiểu; không được đặt mục tiêu hoặc trần đánh giá hồ sơ'
        )
      }
      const targetLevelId = null
      const assessmentCeilingLevelId = null
      if (!minimumLevelId) {
        throw new ValidationException('Kỹ năng của task phải có mức tối thiểu')
      }
      if (!requirement.project_skill_id) {
        throw new ValidationException(
          'Kỹ năng cũ của Task chưa liên kết danh mục Project; cần cấu hình lại kỹ năng Task'
        )
      }
      const isMandatory = input.isMandatory ?? requirement.is_mandatory
      const weight = input.weight ?? requirement.weight

      const levelIds = [minimumLevelId, targetLevelId, assessmentCeilingLevelId].filter(
        (value): value is string => value !== null
      )
      const levels =
        levelIds.length === 0 ? [] : await this.skills.findProficiencyLevelsByIds(levelIds)
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

      const valueViolation = getTaskRequirementValueViolation({
        isMandatory,
        minimumLevelId,
        weight,
      })
      if (valueViolation) {
        throw new ValidationException(valueViolation)
      }

      if (input.rubricVersionId !== undefined && input.rubricVersionId !== null) {
        const rubric = await this.skills.findRubricVersion(input.rubricVersionId)
        if (!rubric) {
          throw new NotFoundException('Rubric version not found')
        }
        if (rubric.skillId !== requirement.skill_id) {
          throw new ValidationException('Rubric version does not belong to the specified skill')
        }
      }

      await this.assertProjectSkillRange(
        requirement.task_id,
        requirement.skill_id,
        requirement.project_skill_id,
        minimumLevelId,
        transaction
      )
      const requiredLevel = await this.skills.findProficiencyLevelById(minimumLevelId)
      const requiredPublicProficiencyCode = getCanonicalProficiencyLevelValue(
        requiredLevel?.code,
        ''
      )
      if (!requiredPublicProficiencyCode) {
        throw new NotFoundException('Không tìm thấy mức kỹ năng tối thiểu')
      }

      const update: UpdateTaskRequirementRecord = {}
      if (input.minimumLevelId !== undefined) {
        update.minimum_level_id = input.minimumLevelId
        update.required_public_proficiency_code = requiredPublicProficiencyCode
      }
      if (requirement.target_level_id !== null || input.targetLevelId !== undefined) {
        update.target_level_id = null
      }
      if (
        requirement.assessment_ceiling_level_id !== null ||
        input.assessmentCeilingLevelId !== undefined
      ) {
        update.assessment_ceiling_level_id = null
      }
      if (input.rubricVersionId !== undefined) {
        update.rubric_version_id = input.rubricVersionId
      }
      if (input.isMandatory !== undefined) {
        update.is_mandatory = input.isMandatory
      }
      if (input.importance !== undefined) {
        update.importance = input.importance
      }
      if (input.weight !== undefined) {
        update.weight = input.weight
      }
      if (input.requirementNotes !== undefined) {
        update.requirement_notes = input.requirementNotes
      }

      const updated = await this.requirementWriter.update(input.requirementId, update, transaction)
      if (this.searchProjectionInvalidation && Object.keys(update).length > 0) {
        await this.searchProjectionInvalidation.stage(
          {
            taskId: requirement.task_id,
            operation: 'upsert',
            changedFields: Object.keys(update),
          },
          transaction
        )
      }
      return updated
    })
  }

  private async assertProjectSkillRange(
    taskId: string,
    skillId: string,
    projectSkillId: string,
    minimumLevelId: string,
    transaction: TaskTransaction
  ): Promise<void> {
    const projectId = await this.requirements.findTaskProjectId?.(taskId, transaction)
    if (!projectId) {
      throw new ValidationException('Không xác định được Project của Task để kiểm tra kỹ năng')
    }
    const projectSkill = (await this.skills.listProjectTaskSkills(projectId)).find(
      (candidate) => candidate.projectSkillId === projectSkillId && candidate.id === skillId
    )
    if (!projectSkill || !projectSkill.isActive || !projectSkill.isSelectableForTasks) {
      throw new ValidationException('Kỹ năng này không được phép dùng cho Task tại Project')
    }
    if (
      !projectSkill.minimumTaskRequirementLevelId ||
      !projectSkill.maximumTaskRequirementLevelId
    ) {
      throw new ValidationException('Kỹ năng này chưa được cấu hình khoảng level tại Project')
    }
    const levels = await this.skills.findProficiencyLevelsByIds([
      minimumLevelId,
      projectSkill.minimumTaskRequirementLevelId,
      projectSkill.maximumTaskRequirementLevelId,
    ])
    const levelById = new Map(levels.map((level) => [level.id, level]))
    const requiredLevel = levelById.get(minimumLevelId)
    const minimumProjectLevel = levelById.get(projectSkill.minimumTaskRequirementLevelId)
    const maximumProjectLevel = levelById.get(projectSkill.maximumTaskRequirementLevelId)
    if (!requiredLevel || !minimumProjectLevel || !maximumProjectLevel) {
      throw new ValidationException('Khoảng level kỹ năng của Project chưa hợp lệ')
    }
    if (
      requiredLevel.scaleId !== minimumProjectLevel.scaleId ||
      requiredLevel.scaleId !== maximumProjectLevel.scaleId ||
      requiredLevel.ordinal < minimumProjectLevel.ordinal ||
      requiredLevel.ordinal > maximumProjectLevel.ordinal
    ) {
      throw new ValidationException('Mức tối thiểu của Task phải nằm trong khoảng level của Project')
    }
  }

  async executeAndWrap(
    input: UpdateTaskRequirementInput
  ): Promise<Result<TaskRequirementRecord, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }
}
