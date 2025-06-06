import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CreateJoinRequestCommand from '#actions/organizations/commands/create_join_request_command'
import CheckJoinEligibilityQuery from '#actions/organizations/queries/check_join_eligibility_query'

/**
 * GET/POST /organizations/:id/join
 * Handle join request for an organization
 */
export default class JoinOrganizationController {
  async handle(ctx: HttpContext) {
    const { params, auth, session, response, request } = ctx
    const createJoinRequest = new CreateJoinRequestCommand(ExecutionContext.fromHttp(ctx))
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const organizationId = params.id as string

    // Check eligibility via Query (org exists + no existing membership)
    const eligibility = await CheckJoinEligibilityQuery.execute(organizationId, user.id)

    if (!eligibility.organization) {
      throw new BusinessLogicException(eligibility.message)
    }

    if (!eligibility.eligible) {
      throw new BusinessLogicException(eligibility.message)
    }

    await createJoinRequest.execute(organizationId)

    const contentType = request.accepts(['html', 'json'])
    const xmlHttpHeader = request.header('X-Requested-With')
    const isXMLHttp = xmlHttpHeader === 'XMLHttpRequest'

    if (contentType === 'json' || isXMLHttp) {
      response.json({
        success: true,
        message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt',
        organization: eligibility.organization,
      })
      return
    }
    session.flash('success', 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt')
    response.redirect().toRoute('organizations.index')
  }
}
