import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'

export default class CreateProjectRoleController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params.projectId as string
    const templateId = request.input('template_id') as string | undefined

    const userId = await checkProjectPermission(ctx, projectId, true)

    if (templateId) {
      const role = await ProfessionalRoleService.cloneTemplateToProject(projectId, templateId, userId)
      await auditPublicApi.log({
        user_id: userId,
        action: 'create',
        entity_type: 'project_professional_role',
        entity_id: role.id,
        old_values: null,
        new_values: {
          project_id: role.project_id,
          code: role.code,
          name: role.name,
          source_template_id: role.source_template_id,
        },
      }, actionContextFromHttp(ctx))
      response.created({ data: role }); return;
    }

    const code = request.input('code') as string
    const name = request.input('name') as string
    const description = request.input('description') as string | undefined

    if (!code || !name) {
      response.badRequest({ message: 'code and name are required for custom project role' }); return;
    }

    const role = await ProfessionalRoleService.createCustomProjectRole({
      projectId,
      code,
      name,
      description,
      createdBy: userId,
    })

    await auditPublicApi.log({
      user_id: userId,
      action: 'create',
      entity_type: 'project_professional_role',
      entity_id: role.id,
      old_values: null,
      new_values: {
        project_id: role.project_id,
        code: role.code,
        name: role.name,
        source_template_id: null,
      },
    }, actionContextFromHttp(ctx))

    response.created({ data: role });
  }
}
