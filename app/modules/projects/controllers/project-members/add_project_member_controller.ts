import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildAddProjectMemberDTO } from '../mappers/request/project-context/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'

/**
 * POST /projects/members → Add member to project
 */
@inject()
export default class AddProjectMemberController {
  constructor(private readonly commands: ProjectMembershipCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const dto = buildAddProjectMemberDTO(request)

    const command = this.commands.makeAddMember(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã thêm thành viên vào dự án thành công',
    })
  }
}
