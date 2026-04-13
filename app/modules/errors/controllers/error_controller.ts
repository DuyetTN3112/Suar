import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import GetRequiredOrganizationPageQuery from '#modules/errors/actions/queries/get_required_organization_page_query'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

@inject()
export default class ErrorController {
  constructor(
    private readonly getRequiredOrganizationPage: GetRequiredOrganizationPageQuery
  ) {}

  /**
   * Hiển thị trang 404 Not Found
   */
  async notFound({ inertia, session }: HttpContext) {
    const flashError: unknown = session.flashMessages.get('error')

    return inertia.render('errors/not_found', {
      message: typeof flashError === 'string' ? flashError : 'Không tìm thấy trang',
    })
  }

  /**
   * Hiển thị trang yêu cầu tham gia tổ chức
   */
  async requireOrganization({ inertia, auth, request }: HttpContext) {
    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const page = await this.getRequiredOrganizationPage.execute({
      userId: auth.user.id,
      page: request.input('page'),
      search: request.input('search'),
    })
    return inertia.render('errors/require_organization', page)
  }

  /**
   * Hiển thị trang lỗi server
   */
  async serverError({ inertia }: HttpContext) {
    return inertia.render('errors/server_error', {})
  }

  /**
   * Hiển thị trang không có quyền truy cập
   */
  async forbidden({ inertia }: HttpContext) {
    return inertia.render('errors/forbidden', {})
  }
}
