import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateProjectMemberDTO } from './mappers/request/project_request_mapper.js'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import UpdateProjectMemberCommand from '#modules/projects/actions/commands/update_project_member_command'

/**
 * PUT /projects/members/:userId → Update member role in project
 */
export default class UpdateProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const dto = buildUpdateProjectMemberDTO(request, params['userId'] as string)

    const command = new UpdateProjectMemberCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã cập nhật vai trò thành viên',
    })
  }
}
