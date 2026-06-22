import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class UpdateProjectRoleSkillController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = String(params.projectId)
    const roleId = String(params.roleId)
    const roleSkillId =
      params.roleSkillId === undefined ? undefined : String(params.roleSkillId)

    const userId = await checkProjectPermission(ctx, projectId, true)

    if (roleSkillId) {
      // Update existing skill config
      const minLevelId = request.input('minimum_level_id') as string | undefined
      const targetLevelId = request.input('target_level_id') as string | undefined
      const ceilingLevelId = request.input('assessment_ceiling_level_id') as string | undefined
      const isMandatory = request.input('is_mandatory') as boolean | undefined
      const importance = request.input('importance') as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical'
        | undefined
      const weight = request.input('weight') as number | string | undefined
      const sortOrder = request.input('sort_order') as number | string | undefined
      const notes = request.input('notes') as string | undefined

      const roleSkillBefore = await ProfessionalRoleRepository.findProjectRoleSkillById(roleSkillId)
      const original = roleSkillBefore ? {
        minimum_level_id: roleSkillBefore.minimum_level_id,
        target_level_id: roleSkillBefore.target_level_id,
        assessment_ceiling_level_id: roleSkillBefore.assessment_ceiling_level_id,
        is_mandatory: roleSkillBefore.is_mandatory,
        importance: roleSkillBefore.importance,
        weight: roleSkillBefore.weight,
        sort_order: roleSkillBefore.sort_order,
        notes: roleSkillBefore.notes,
      } : null

      const updated = await ProfessionalRoleService.updateProjectRoleSkill(roleSkillId, {
        minimumLevelId: minLevelId ?? undefined,
        targetLevelId: targetLevelId ?? undefined,
        assessmentCeilingLevelId: ceilingLevelId ?? undefined,
        isMandatory: isMandatory ?? undefined,
        importance: importance ?? undefined,
        weight: weight !== undefined ? Number(weight) : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
        notes: notes ?? undefined,
      })

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

      await auditPublicApi.log({
        user_id: userId,
        action: 'update',
        entity_type: 'project_professional_role_skill',
        entity_id: roleSkillId,
        old_values: original,
        new_values: updatedValues,
      }, actionContextFromHttp(ctx))

      response.ok({ data: updated }); return
    }

    // Add new skill to role
    const projectSkillId = request.input('project_skill_id') as string
    const minLevelId = request.input('minimum_level_id') as string | undefined
    const targetLevelId = request.input('target_level_id') as string | undefined
    const ceilingLevelId = request.input('assessment_ceiling_level_id') as string | undefined
    const isMandatory = request.input('is_mandatory') as boolean | undefined
    const importance = request.input('importance') as 'low' | 'medium' | 'high' | 'critical' | undefined
    const weight = request.input('weight') as number | undefined
    const sortOrder = request.input('sort_order') as number | undefined
    const notes = request.input('notes') as string | undefined

    if (!projectSkillId) {
      response.badRequest({ message: 'project_skill_id is required' }); return
    }

    const created = await ProfessionalRoleService.addSkillToProjectRole({
      projectProfessionalRoleId: roleId,
      projectSkillId,
      minimumLevelId: minLevelId ?? null,
      targetLevelId: targetLevelId ?? null,
      assessmentCeilingLevelId: ceilingLevelId ?? null,
      isMandatory: isMandatory ?? false,
      importance: importance ?? 'medium',
      weight: weight ?? 1.0,
      sortOrder: sortOrder ?? 0,
      notes: notes ?? null,
    })

    await auditPublicApi.log({
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
        importance: importance ?? 'medium',
        weight: weight ?? 1.0,
        sort_order: sortOrder ?? 0,
        notes: notes ?? null,
      },
    }, actionContextFromHttp(ctx))

    response.created({ data: created })
  }
}
