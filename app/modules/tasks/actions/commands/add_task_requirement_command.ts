import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/proficiency_framework'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementImportance,
  TaskRequirementReader,
  TaskRequirementRecord,
  TaskRequirementSource,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  getTaskRequirementLevelConfigurationViolation,
  getTaskRequirementValueViolation,
} from '#modules/tasks/domain/task_skill_requirement_rules'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


export interface AddTaskRequirementInput {
  taskId: string
  skillId: string
  projectSkillId?: string | null
  sourceProjectProfessionalRoleId?: string | null
  sourceRoleSkillId?: string | null
  minimumLevelId?: string | null
  targetLevelId?: string | null
  assessmentCeilingLevelId?: string | null
  rubricVersionId?: string | null
  requiredPublicProficiencyCode?: string
  isMandatory?: boolean
  importance?: TaskRequirementImportance
  weight?: number
  requirementSource?: TaskRequirementSource
  requirementNotes?: string | null
}

export default class AddTaskRequirementCommand {
  constructor(
    private readonly requirements: TaskRequirementReader,
    private readonly requirementWriter: TaskRequirementWriter,
    private readonly skills: TaskSkillReader,
    private readonly transactions: TaskTransactionRunner
  ) {}

  async execute(input: AddTaskRequirementInput): Promise<TaskRequirementRecord> {
    return this.transactions.run(async (transaction) => {
      if (await this.requirements.findByTaskAndSkill(input.taskId, input.skillId, transaction)) {
        throw new ConflictException('Skill already required in this task')
      }
      const minimumLevelId = input.minimumLevelId ?? null
      const targetLevelId = input.targetLevelId ?? null
      const assessmentCeilingLevelId = input.assessmentCeilingLevelId ?? null
      const isMandatory = input.isMandatory ?? true
      const weight = input.weight ?? 1
      await this.assertValidLevelConfiguration(minimumLevelId, targetLevelId, assessmentCeilingLevelId)
      const valueViolation = getTaskRequirementValueViolation({ isMandatory, minimumLevelId, weight })
      if (valueViolation) throw new ValidationException(valueViolation)
      if (input.rubricVersionId) {
        const rubricVersion = await this.skills.findRubricVersion(input.rubricVersionId)
        if (!rubricVersion) throw new NotFoundException('Rubric version not found')
        if (rubricVersion.skillId !== input.skillId) {
          throw new ValidationException('Rubric version does not belong to the specified skill')
        }
      }
      const requiredPublicProficiencyCode = await this.resolveCanonicalRequiredLevelCode(
        omitUndefined({
          requiredPublicProficiencyCode: input.requiredPublicProficiencyCode,
          minimumLevelId,
          targetLevelId,
          assessmentCeilingLevelId,
        })
      )
      return this.requirementWriter.create({
        task_id: input.taskId,
        skill_id: input.skillId,
        project_skill_id: input.projectSkillId ?? null,
        source_project_professional_role_id: input.sourceProjectProfessionalRoleId ?? null,
        source_role_skill_id: input.sourceRoleSkillId ?? null,
        minimum_level_id: minimumLevelId,
        target_level_id: targetLevelId,
        assessment_ceiling_level_id: assessmentCeilingLevelId,
        rubric_version_id: input.rubricVersionId ?? null,
        required_public_proficiency_code: requiredPublicProficiencyCode,
        is_mandatory: isMandatory,
        importance: input.importance ?? 'medium',
        weight,
        requirement_source: input.requirementSource ?? 'manual',
        requirement_notes: input.requirementNotes ?? null,
      }, transaction)
    })
  }

  private async assertValidLevelConfiguration(minimumLevelId: string | null, targetLevelId: string | null, assessmentCeilingLevelId: string | null): Promise<void> {
    const ids = [minimumLevelId, targetLevelId, assessmentCeilingLevelId].filter((value): value is string => value !== null)
    const levels = ids.length === 0 ? [] : await this.skills.findProficiencyLevelsByIds(ids)
    const violation = getTaskRequirementLevelConfigurationViolation({ minimumLevelId, targetLevelId, assessmentCeilingLevelId, levels })
    if (violation?.startsWith('Proficiency level not found:')) throw new NotFoundException(violation)
    if (violation) throw new ValidationException(violation)
  }

  private async resolveCanonicalRequiredLevelCode(input: { requiredPublicProficiencyCode?: string; minimumLevelId?: string | null; targetLevelId?: string | null; assessmentCeilingLevelId?: string | null }): Promise<string> {
    if (input.requiredPublicProficiencyCode?.trim()) {
      if (!isCanonicalProficiencyLevelCode(input.requiredPublicProficiencyCode)) {
        throw new ValidationException(`requiredPublicProficiencyCode must be a canonical code (l0-l14): ${input.requiredPublicProficiencyCode}`)
      }
      return getCanonicalProficiencyLevelValue(input.requiredPublicProficiencyCode)
    }
    const levelId = input.minimumLevelId ?? input.targetLevelId ?? input.assessmentCeilingLevelId ?? null
    if (!levelId) {
      throw new ValidationException('Kỹ năng của task phải có mức tối thiểu')
    }
    const level = await this.skills.findProficiencyLevelById(levelId)
    const levelCode = getCanonicalProficiencyLevelValue(level?.code, '')
    if (!levelCode) {
      throw new NotFoundException('Không tìm thấy mức kỹ năng tối thiểu')
    }
    return levelCode
  }
}
