import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from './mappers/request/read_aliased_input.js'
import { camelizeResponseValue } from './mappers/response/camelize_response.js'
import { SkillProjectAccessGuard } from './project_access_guard.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/clone_professional_role_template_command'
import CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/create_custom_project_role_command'

@inject()
export default class CreateProjectRoleController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly cloneProfessionalRoleTemplate: CloneProfessionalRoleTemplateCommand,
    private readonly createCustomProjectRole: CreateCustomProjectRoleCommand
  ) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params['projectId'] as string
    const templateId = readAliasedInput(request, 'templateId', 'template_id') as string | undefined

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

    if (templateId) {
      const role = await this.cloneProfessionalRoleTemplate.execute({
        projectId,
        templateId,
        createdBy: userId,
        audit: {
          actorId: userId,
          context: actionContextFromHttp(ctx),
        },
      })
      response
        .status(HttpStatus.CREATED)
        .json({ data: camelizeResponseValue(this.toResponse(role)) })
      return
    }

    const code = request.input('code') as string
    const name = request.input('name') as string
    const description = request.input('description') as string | undefined

    if (!code || !name) {
      throw new BusinessLogicException('code and name are required for custom project role')
    }

    const role = await this.createCustomProjectRole.execute({
      projectId,
      code,
      name,
      ...(description !== undefined ? { description } : {}),
      createdBy: userId,
      audit: {
        actorId: userId,
        context: actionContextFromHttp(ctx),
      },
    })

    response.status(HttpStatus.CREATED).json({ data: camelizeResponseValue(this.toResponse(role)) })
  }

  private toResponse(role: {
    id: string
    project_id: string
    source_template_id: string | null
    code: string
    name: string
    description: string | null
    is_active: boolean
    version: number
    created_by: string | null
  }) {
    return {
      id: role.id,
      project_id: role.project_id,
      source_template_id: role.source_template_id,
      code: role.code,
      name: role.name,
      description: role.description,
      is_active: role.is_active,
      version: role.version,
      created_by: role.created_by,
    }
  }
}
