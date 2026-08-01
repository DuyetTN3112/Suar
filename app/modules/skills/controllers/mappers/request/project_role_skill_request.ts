import type { HttpContext } from '@adonisjs/core/http'


import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import type { AddProjectRoleSkillInput } from '#modules/skills/actions/commands/add_project_role_skill_command'
import type { UpdateProjectRoleSkillInput } from '#modules/skills/actions/commands/update_project_role_skill_command'
import { readAliasedInput } from '#modules/skills/controllers/mappers/request/read_aliased_input'
import {
  DEFAULT_SKILL_IMPORTANCE,
  DEFAULT_SKILL_WEIGHT,
  type SkillImportance,
} from '#modules/skills/public_contracts/skill_constants'

export function readUpdateProjectRoleSkillInput(
  request: HttpContext['request'],
  projectRoleSkillId: string
): UpdateProjectRoleSkillInput {
  const weight = request.input('weight') as number | string | undefined
  const sortOrder = readAliasedInput(request, 'sortOrder', 'sort_order') as
    | number
    | string
    | undefined

  return {
    projectRoleSkillId,
    ...omitUndefined({
      minimumLevelId: readAliasedInput(request, 'minimumLevelId', 'minimum_level_id') as
        | string
        | undefined,
      targetLevelId: readAliasedInput(request, 'targetLevelId', 'target_level_id') as
        | string
        | undefined,
      assessmentCeilingLevelId: readAliasedInput(
        request,
        'assessmentCeilingLevelId',
        'assessment_ceiling_level_id'
      ) as string | undefined,
      isMandatory: readAliasedInput(request, 'isMandatory', 'is_mandatory') as
        | boolean
        | undefined,
      importance: request.input('importance') as SkillImportance | undefined,
      weight: weight === undefined ? undefined : Number(weight),
      sortOrder: sortOrder === undefined ? undefined : Number(sortOrder),
      notes: request.input('notes') as string | undefined,
    }),
  }
}

export function readAddProjectRoleSkillInput(
  request: HttpContext['request'],
  projectProfessionalRoleId: string
): AddProjectRoleSkillInput {
  const projectSkillId = readAliasedInput(request, 'projectSkillId', 'project_skill_id') as
    | string
    | undefined
  if (!projectSkillId) {
    throw new BusinessLogicException('projectSkillId is required')
  }

  return {
    projectProfessionalRoleId,
    projectSkillId,
    minimumLevelId:
      (readAliasedInput(request, 'minimumLevelId', 'minimum_level_id') as string | undefined) ??
      null,
    targetLevelId:
      (readAliasedInput(request, 'targetLevelId', 'target_level_id') as string | undefined) ?? null,
    assessmentCeilingLevelId:
      (readAliasedInput(
        request,
        'assessmentCeilingLevelId',
        'assessment_ceiling_level_id'
      ) as string | undefined) ?? null,
    isMandatory:
      (readAliasedInput(request, 'isMandatory', 'is_mandatory') as boolean | undefined) ?? false,
    importance:
      (request.input('importance') as SkillImportance | undefined) ?? DEFAULT_SKILL_IMPORTANCE,
    weight: (request.input('weight') as number | undefined) ?? DEFAULT_SKILL_WEIGHT,
    sortOrder:
      (readAliasedInput(request, 'sortOrder', 'sort_order') as number | undefined) ?? 0,
    notes: (request.input('notes') as string | undefined) ?? null,
  }
}
