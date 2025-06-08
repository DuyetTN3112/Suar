import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddMemberByEmailCommand from '#actions/organizations/commands/add_member_by_email_command'

/**
 * POST /organizations/:id/members/add
 * Add a new member to the organization
 */
export default class AddMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const body = request.body() as { email: string; roleId: string }

    // Delegate to Command — user lookup + add member in one action
    const command = new AddMemberByEmailCommand(ExecutionContext.fromHttp(ctx))
    await command.execute(params.id as string, body.email, body.roleId)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({
        success: true,
        message: 'Thêm thành viên thành công',
      })
      return
    }

    session.flash('success', 'Thêm thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
