import type { HttpContext } from '@adonisjs/core/http'

import { buildRemoveProjectMemberDTO } from './mappers/request/project_request_mapper.js'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import RemoveProjectMemberCommand from '#modules/projects/actions/commands/remove_project_member_command'

/**
 * DELETE /projects/members/:userId → Remove member from project
 */
export default class RemoveProjectMemberController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const dto = buildRemoveProjectMemberDTO(request, params['userId'] as string)

    const command = new RemoveProjectMemberCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã xóa thành viên khỏi dự án',
    })
  }
}
