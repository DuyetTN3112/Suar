import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /organizations/:id/switch — switch current organization
 * GET /organizations/switch/:id — switch and redirect
 */
export default class SwitchAndRedirectController {
  async switchOrganization(ctx: HttpContext) {
    const { request, response, session } = ctx
    const switchOrganization = new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx))
    try {
      const organizationId = request.input('organization_id') as string

      await switchOrganization.execute(organizationId)

      const contentType = request.accepts(['html', 'json'])
      if (contentType === 'json') {
        response.json({
          success: true,
          message: 'Đã chuyển đổi tổ chức thành công',
        })
        return
      }

      session.flash('success', 'Đã chuyển đổi tổ chức thành công')
      response.redirect('/tasks')
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi chuyển đổi tổ chức'
      if (request.accepts(['html', 'json']) === 'json') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  async handle(ctx: HttpContext) {
    const { params, auth, session, response } = ctx
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string

    // Delegate all work to SwitchOrganizationCommand (validates membership + updates user)
    const switchOrganization = new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx))

    try {
      await switchOrganization.execute(organizationId)

      // Update session
      session.put('current_organization_id', organizationId)
      await session.commit()

      const intendedUrl = session.get('intended_url', '/') as string
      session.forget('intended_url')
      await session.commit()

      response.redirect(intendedUrl)
    } catch (error: unknown) {
      // If membership validation fails, show forbidden
      response.status(HttpStatus.FORBIDDEN).redirect('/errors/forbidden')
    }
  }
}
