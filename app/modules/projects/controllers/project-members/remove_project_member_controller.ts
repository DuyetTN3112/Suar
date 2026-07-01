import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildRemoveProjectMemberDTO } from '../mappers/request/project-context/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'

/**
 * DELETE /projects/members/:userId → Remove member from project
 */
@inject()
export default class RemoveProjectMemberController {
  constructor(private readonly commands: ProjectMembershipCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const dto = buildRemoveProjectMemberDTO(request, params['userId'] as string)

    const command = this.commands.makeRemoveMember(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã xóa thành viên khỏi dự án',
    })
  }
}
