import AppException from '#modules/errors/public_contracts/application_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { GetRoleRequirementsResult } from '#modules/tasks/actions/dtos/response/role_requirement_prefill'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export interface GetRoleRequirementsInput {
  projectId: string
  roleId: string
}

export default class GetRoleRequirementsQuery extends BaseQuery<
  GetRoleRequirementsInput,
  GetRoleRequirementsResult
> {
  constructor(private readonly skills: TaskSkillReader) {
    super()
  }

  async handle(input: GetRoleRequirementsInput): Promise<GetRoleRequirementsResult> {
    const role = await this.skills.findProjectRole(input.roleId)
    if (role?.projectId !== input.projectId) {
      throw new NotFoundException('Role not found in project')
    }

    const levelIds = role.roleSkills.flatMap((roleSkill) =>
      [
        roleSkill.minimumLevelId,
        roleSkill.targetLevelId,
        roleSkill.assessmentCeilingLevelId,
      ].filter((value): value is string => Boolean(value))
    )
    const levels = await this.skills.findProficiencyLevelsByIds(levelIds)
    const levelsById = new Map(levels.map((level) => [level.id, level]))

    return {
      roleId: input.roleId,
      roleName: role.name,
      requirements: role.roleSkills.map((roleSkill) => {
        const levelId =
          roleSkill.minimumLevelId ??
          roleSkill.targetLevelId ??
          roleSkill.assessmentCeilingLevelId ??
          null
        const levelCode = levelId ? levelsById.get(levelId)?.code : null

        return {
          skillId: roleSkill.skillId,
          skillName: roleSkill.skillName,
          categoryCode: roleSkill.categoryCode,
          projectSkillId: roleSkill.projectSkillId,
          sourceProjectProfessionalRoleId: input.roleId,
          sourceRoleSkillId: roleSkill.id,
          minimumLevelId: roleSkill.minimumLevelId,
          targetLevelId: roleSkill.targetLevelId,
          assessmentCeilingLevelId: roleSkill.assessmentCeilingLevelId,
          minimumLevelCode: roleSkill.minimumLevelId
            ? getCanonicalProficiencyLevelValue(
                levelsById.get(roleSkill.minimumLevelId)?.code,
                ''
              ) || null
            : null,
          targetLevelCode: roleSkill.targetLevelId
            ? getCanonicalProficiencyLevelValue(
                levelsById.get(roleSkill.targetLevelId)?.code,
                ''
              ) || null
            : null,
          assessmentCeilingLevelCode: roleSkill.assessmentCeilingLevelId
            ? getCanonicalProficiencyLevelValue(
                levelsById.get(roleSkill.assessmentCeilingLevelId)?.code,
                ''
              ) || null
            : null,
          requiredLevelCode: getCanonicalProficiencyLevelValue(levelCode, ''),
          isMandatory: roleSkill.isMandatory,
          importance: roleSkill.importance,
          weight: roleSkill.weight,
          requirementSource: 'professional_role_prefill' as const,
          requirementNotes: roleSkill.notes,
        }
      }),
    }
  }

  override async executeAndWrap(input: GetRoleRequirementsInput): Promise<Result<GetRoleRequirementsResult, AppException>> {
    try {
      return Result.ok(await this.handle(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
