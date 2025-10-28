import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'
import { camelizeResponseValue } from './support/camelize_response.js'
import { readAliasedInput } from './support/read_aliased_input.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import {
  DEFAULT_SKILL_IMPORTANCE,
  type SkillImportance,
} from '#modules/skills/constants/skill_constants'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class UpdateProjectRoleSkillController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const projectId = String(params['projectId'])
    const roleId = String(params['roleId'])
    const roleSkillId = params['roleSkillId'] === undefined ? undefined : String(params['roleSkillId'])

    const userId = await requireProjectAccessUserId(ctx, projectId, true)

    if (roleSkillId) {
      // Update existing skill config
      const minLevelId = readAliasedInput(request, 'minimumLevelId', 'minimum_level_id') as
        | string
        | undefined
      const targetLevelId = readAliasedInput(request, 'targetLevelId', 'target_level_id') as
        | string
        | undefined
      const ceilingLevelId = readAliasedInput(
        request,
        'assessmentCeilingLevelId',
        'assessment_ceiling_level_id'
      ) as string | undefined
      const isMandatory = readAliasedInput(request, 'isMandatory', 'is_mandatory') as
        | boolean
        | undefined
      const importance = request.input('importance') as SkillImportance | undefined
      const weight = request.input('weight') as number | string | undefined
      const sortOrder = readAliasedInput(request, 'sortOrder', 'sort_order') as
        | number
        | string
        | undefined
      const notes = request.input('notes') as string | undefined

      const roleSkillBefore = await ProfessionalRoleRepository.findProjectRoleSkillById(roleSkillId)
      const original = roleSkillBefore
        ? {
            minimum_level_id: roleSkillBefore.minimum_level_id,
            target_level_id: roleSkillBefore.target_level_id,
            assessment_ceiling_level_id: roleSkillBefore.assessment_ceiling_level_id,
            is_mandatory: roleSkillBefore.is_mandatory,
            importance: roleSkillBefore.importance,
            weight: roleSkillBefore.weight,
            sort_order: roleSkillBefore.sort_order,
            notes: roleSkillBefore.notes,
          }
        : null

      const updated = await ProfessionalRoleService.updateProjectRoleSkill(
        roleSkillId,
        omitUndefined({
          minimumLevelId: minLevelId,
          targetLevelId,
          assessmentCeilingLevelId: ceilingLevelId,
          isMandatory,
          importance,
          weight: weight !== undefined ? Number(weight) : undefined,
          sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
          notes,
        })
      )

      const updatedValues = {
        minimum_level_id: updated.minimum_level_id,
        target_level_id: updated.target_level_id,
        assessment_ceiling_level_id: updated.assessment_ceiling_level_id,
        is_mandatory: updated.is_mandatory,
        importance: updated.importance,
        weight: updated.weight,
        sort_order: updated.sort_order,
        notes: updated.notes,
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: 'update',
          entity_type: 'project_professional_role_skill',
          entity_id: roleSkillId,
          old_values: original,
          new_values: updatedValues,
        },
        actionContextFromHttp(ctx)
      )

      return { data: camelizeResponseValue(updated.serialize()) }
    }

    // Add new skill to role
    const projectSkillId = readAliasedInput(request, 'projectSkillId', 'project_skill_id') as
      | string
      | undefined
    const minLevelId = readAliasedInput(request, 'minimumLevelId', 'minimum_level_id') as
      | string
      | undefined
    const targetLevelId = readAliasedInput(request, 'targetLevelId', 'target_level_id') as
      | string
      | undefined
    const ceilingLevelId = readAliasedInput(
      request,
      'assessmentCeilingLevelId',
      'assessment_ceiling_level_id'
    ) as string | undefined
    const isMandatory = readAliasedInput(request, 'isMandatory', 'is_mandatory') as
      | boolean
      | undefined
    const importance = request.input('importance') as SkillImportance | undefined
    const weight = request.input('weight') as number | undefined
    const sortOrder = readAliasedInput(request, 'sortOrder', 'sort_order') as number | undefined
    const notes = request.input('notes') as string | undefined

    if (!projectSkillId) {
      throw new BusinessLogicException('projectSkillId is required')
    }

    const created = await ProfessionalRoleService.addSkillToProjectRole({
      projectProfessionalRoleId: roleId,
      projectSkillId,
      minimumLevelId: minLevelId ?? null,
      targetLevelId: targetLevelId ?? null,
      assessmentCeilingLevelId: ceilingLevelId ?? null,
      isMandatory: isMandatory ?? false,
      importance: importance ?? DEFAULT_SKILL_IMPORTANCE,
      weight: weight ?? 1.0,
      sortOrder: sortOrder ?? 0,
      notes: notes ?? null,
    })

    await auditPublicApi.log(
      {
        user_id: userId,
        action: 'create',
        entity_type: 'project_professional_role_skill',
        entity_id: created.id,
        old_values: null,
        new_values: {
          project_professional_role_id: roleId,
          project_skill_id: projectSkillId,
          minimum_level_id: minLevelId ?? null,
          target_level_id: targetLevelId ?? null,
          assessment_ceiling_level_id: ceilingLevelId ?? null,
          is_mandatory: isMandatory ?? false,
          importance: importance ?? DEFAULT_SKILL_IMPORTANCE,
          weight: weight ?? 1.0,
          sort_order: sortOrder ?? 0,
          notes: notes ?? null,
        },
      },
      actionContextFromHttp(ctx)
    )

    return ctx.response.created({ data: camelizeResponseValue(created.serialize()) })
  }
}
