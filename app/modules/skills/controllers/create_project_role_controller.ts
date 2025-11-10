import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'
import { camelizeResponseValue } from './support/camelize_response.js'
import { readAliasedInput } from './support/read_aliased_input.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'

export default class CreateProjectRoleController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params['projectId'] as string
    const templateId = readAliasedInput(request, 'templateId', 'template_id') as string | undefined

    const userId = await requireProjectAccessUserId(ctx, projectId, true)

    if (templateId) {
      const role = await ProfessionalRoleService.cloneTemplateToProject(
        projectId,
        templateId,
        userId
      )
      await auditPublicApi.log(
        {
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
        },
        actionContextFromHttp(ctx)
      )
      response.status(HttpStatus.CREATED).json({ data: camelizeResponseValue(role.serialize()) })
      return
    }

    const code = request.input('code') as string
    const name = request.input('name') as string
    const description = request.input('description') as string | undefined

    if (!code || !name) {
      throw new BusinessLogicException('code and name are required for custom project role')
    }

    const role = await ProfessionalRoleService.createCustomProjectRole({
      projectId,
      code,
      name,
      ...(description !== undefined ? { description } : {}),
      createdBy: userId,
    })

    await auditPublicApi.log(
      {
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
      },
      actionContextFromHttp(ctx)
    )

    response.status(HttpStatus.CREATED).json({ data: camelizeResponseValue(role.serialize()) })
  }
}
