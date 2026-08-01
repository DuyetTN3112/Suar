import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementImportance,
  TaskRequirementReader,
  TaskRequirementRecord,
  TaskRequirementWriter,
  UpdateTaskRequirementRecord,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
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
    private readonly transactions: TaskTransactionRunner
  ) {}

  async execute(input: UpdateTaskRequirementInput): Promise<TaskRequirementRecord> {
    return this.transactions.run(async (transaction) => {
      const requirement = await this.requirements.findById(
        input.requirementId,
        transaction
      )
      if (!requirement) {
        throw new NotFoundException('Task skill requirement not found')
      }

      const minimumLevelId =
        input.minimumLevelId !== undefined
          ? input.minimumLevelId
          : requirement.minimum_level_id
      const targetLevelId =
        input.targetLevelId !== undefined
          ? input.targetLevelId
          : requirement.target_level_id
      const assessmentCeilingLevelId =
        input.assessmentCeilingLevelId !== undefined
          ? input.assessmentCeilingLevelId
          : requirement.assessment_ceiling_level_id
      const isMandatory = input.isMandatory ?? requirement.is_mandatory
      const weight = input.weight ?? requirement.weight

      const levelIds = [
        minimumLevelId,
        targetLevelId,
        assessmentCeilingLevelId,
      ].filter((value): value is string => value !== null)
      const levels =
        levelIds.length === 0
          ? []
          : await this.skills.findProficiencyLevelsByIds(levelIds)
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

      const update: UpdateTaskRequirementRecord = {}
      if (input.minimumLevelId !== undefined) {
        update.minimum_level_id = input.minimumLevelId
      }
      if (input.targetLevelId !== undefined) {
        update.target_level_id = input.targetLevelId
      }
      if (input.assessmentCeilingLevelId !== undefined) {
        update.assessment_ceiling_level_id = input.assessmentCeilingLevelId
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

      return this.requirementWriter.update(input.requirementId, update, transaction)
    })
  }
}
