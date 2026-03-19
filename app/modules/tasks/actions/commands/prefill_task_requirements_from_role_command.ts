import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_framework'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementReader,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface PrefillTaskRequirementsFromRoleInput {
  taskId: string
  projectProfessionalRoleId: string
}

export interface PrefillTaskRequirementsFromRoleResult {
  addedCount: number
  skippedCount: number
}

export default class PrefillTaskRequirementsFromRoleCommand {
  constructor(
    private readonly requirements: TaskRequirementReader,
    private readonly requirementWriter: TaskRequirementWriter,
    private readonly skills: TaskSkillReader,
    private readonly transactions: TaskTransactionRunner
  ) {}

  async execute(
    input: PrefillTaskRequirementsFromRoleInput
  ): Promise<PrefillTaskRequirementsFromRoleResult> {
    const role = await this.skills.findProjectRole(input.projectProfessionalRoleId)
    if (!role) {
      throw new NotFoundException('Project professional role not found')
    }
    if (!role.isActive) {
      throw new ConflictException('Cannot prefill from an inactive project professional role')
    }

    return this.transactions.run(async (transaction) => {
      let addedCount = 0
      let skippedCount = 0

      for (const roleSkill of role.roleSkills) {
        const existing = await this.requirements.findByTaskAndSkill(
          input.taskId,
          roleSkill.skillId,
          transaction
        )
        const minimumLevelId =
          roleSkill.minimumLevelId ??
          (roleSkill.isMandatory ? roleSkill.targetLevelId : null)

        if (existing || (roleSkill.isMandatory && !minimumLevelId)) {
          skippedCount += 1
          continue
        }

        const levelId =
          minimumLevelId ??
          roleSkill.targetLevelId ??
          roleSkill.assessmentCeilingLevelId
        const level = levelId
          ? await this.skills.findProficiencyLevelById(levelId)
          : null

        await this.requirementWriter.create(
          {
            task_id: input.taskId,
            skill_id: roleSkill.skillId,
            project_skill_id: roleSkill.projectSkillId,
            source_project_professional_role_id:
              input.projectProfessionalRoleId,
            source_role_skill_id: roleSkill.id,
            minimum_level_id: minimumLevelId,
            target_level_id: roleSkill.targetLevelId,
            assessment_ceiling_level_id: roleSkill.assessmentCeilingLevelId,
            rubric_version_id: null,
            required_public_proficiency_code:
              getCanonicalProficiencyLevelValue(level?.code, 'l4'),
            is_mandatory: roleSkill.isMandatory,
            importance: roleSkill.importance,
            weight: roleSkill.weight,
            requirement_source: 'professional_role_prefill',
            requirement_notes: roleSkill.notes,
          },
          transaction
        )
        addedCount += 1
      }

      return { addedCount, skippedCount }
    })
  }
}
