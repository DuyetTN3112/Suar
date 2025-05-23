import { HttpContext } from '@adonisjs/core/http'

export default class ErrorController {
  /**
   * Hiển thị trang 404 Not Found
   */
  async notFound({ inertia }: HttpContext) {
    return inertia.render('errors/not_found')
  }

  /**
   * Hiển thị trang yêu cầu tham gia tổ chức
   */
  async requireOrganization({ inertia }: HttpContext) {
    return inertia.render('errors/require_organization')
  }

  /**
   * Hiển thị trang lỗi server
   */
  async serverError({ inertia }: HttpContext) {
    return inertia.render('errors/server_error')
  }

  /**
   * Hiển thị trang không có quyền truy cập
   */
  async forbidden({ inertia }: HttpContext) {
    return inertia.render('errors/forbidden')
  }
}
