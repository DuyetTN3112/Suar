import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import CreateNotification from '#actions/common/create_notification'
import { buildAddDirectMemberDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'

/**
 * POST /organizations/:id/members/add-direct
 * Add user directly to organization (for admin)
 */
export default class AddDirectMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const dto = buildAddDirectMemberDTO(request, params.id as string)
    await new AddMemberCommand(ExecutionContext.fromHttp(ctx), new CreateNotification()).execute(
      dto
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Thêm thành viên thành công'))
      return
    }

    session.flash('success', 'Thêm thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
