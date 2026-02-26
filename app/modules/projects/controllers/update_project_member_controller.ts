import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProjectMemberDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'

/**
 * PUT /projects/members/:userId → Update member role in project
 */
@inject()
export default class UpdateProjectMemberController {
  constructor(private readonly commands: ProjectMembershipCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const dto = buildUpdateProjectMemberDTO(request, params['userId'] as string)

    const command = this.commands.makeUpdateMember(actionContextFromHttp(ctx))
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã cập nhật vai trò thành viên',
    })
  }
}
