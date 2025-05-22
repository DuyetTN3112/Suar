import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected renderStatusPages = true

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const { request, response, session, inertia } = ctx

    // Xử lý lỗi token CSRF hết hạn
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 419) {
      session.flash('errors', { form: 'Trang đã hết hạn, vui lòng thử lại' })
      return response.redirect().back()
    }

    // Xử lý lỗi không có quyền truy cập
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
      if (request.header('X-Inertia')) {
        return inertia.location('/login')
      }
      session.flash('errors', { form: 'Vui lòng đăng nhập để tiếp tục' })
      return response.redirect('/login')
    }

    // Xử lý lỗi không đủ quyền
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 403) {
      session.flash('errors', { form: 'Bạn không có quyền thực hiện hành động này' })
      return response.redirect().back()
    }

    return super.handle(error, ctx)
  }

  /**
   * Report error to logging service or other monitoring tools
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
