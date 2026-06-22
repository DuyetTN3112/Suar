import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class DeactivateProjectRoleController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params.projectId as string
    const roleId = params.roleId as string
    const roleSkillId = params.roleSkillId as string | undefined

    const userId = await checkProjectPermission(ctx, projectId, true)

    if (roleSkillId) {
      const roleSkillBefore = await ProfessionalRoleRepository.findProjectRoleSkillById(roleSkillId)
      await ProfessionalRoleService.removeSkillFromProjectRole(roleSkillId)

      await auditPublicApi.log({
        user_id: userId,
        action: 'delete',
        entity_type: 'project_professional_role_skill',
        entity_id: roleSkillId,
        old_values: roleSkillBefore ? {
          project_professional_role_id: roleSkillBefore.project_professional_role_id,
          project_skill_id: roleSkillBefore.project_skill_id,
        } : null,
        new_values: null,
      }, actionContextFromHttp(ctx))

      response.ok({ message: 'Skill removed from professional role successfully' }); return;
    }

    const role = await ProfessionalRoleService.deactivateProjectRole(roleId)

    await auditPublicApi.log({
      user_id: userId,
      action: 'deactivate',
      entity_type: 'project_professional_role',
      entity_id: roleId,
      old_values: { is_active: true },
      new_values: { is_active: false },
    }, actionContextFromHttp(ctx))

    response.ok({ data: role });
  }
}
