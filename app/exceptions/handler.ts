import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'

import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import Youch from 'youch'
import YouchTerminal from 'youch-terminal'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected override debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. You might want to enable them in production only, but feel
   * free to enable them in development as well.
   */
  protected override renderStatusPages = true

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected override statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  override async handle(error: unknown, ctx: HttpContext) {
    const { request, response, session, inertia, auth } = ctx

    // Nếu ở development mode và có lỗi thực sự, hiển thị với Youch
    if (!app.inProduction && error instanceof Error) {
      // Kiểm tra nếu là API request hoặc không phải Inertia request
      const isApiRequest = request.url().startsWith('/api/')
      const isInertiaRequest = request.header('X-Inertia')

      if (!isInertiaRequest || isApiRequest) {
        const youch = new Youch(error, request.request)

        // Thêm metadata về request
        youch.group('Request', {
          info: [
            { key: 'URL', value: request.url() },
            { key: 'Method', value: request.method() },
            { key: 'IP', value: request.ip() },
            { key: 'User Agent', value: request.header('user-agent') || 'N/A' },
          ],
        })

        // Thêm headers
        const headers = request.headers()
        youch.group('Request', {
          headers: Object.entries(headers).map(([key, value]) => ({
            key,
            value: String(value),
          })),
        })

        // Thêm query params nếu có
        const queryParams = request.qs()
        if (Object.keys(queryParams).length > 0) {
          youch.group('Request', {
            queryParams: Object.entries(queryParams).map(([key, value]) => ({
              key,
              value: JSON.stringify(value),
            })),
          })
        }

        // Thêm body nếu có (và không phải file upload)
        const body = request.all()
        if (Object.keys(body).length > 0) {
          youch.group('Request', {
            body: Object.entries(body)
              .filter(([key]) => !key.toLowerCase().includes('password'))
              .map(([key, value]) => ({
                key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
              })),
          })
        }

        // Thêm thông tin user nếu đã đăng nhập
        if (auth.user) {
          youch.group('Auth', {
            user: [
              { key: 'ID', value: String(auth.user.id) },
              { key: 'Email', value: auth.user.email },
              { key: 'Name', value: auth.user.fullName || 'N/A' },
            ],
          })
        }

        // Thêm session data
        if (session) {
          const sessionData = session.all()
          if (Object.keys(sessionData).length > 0) {
            youch.group('Session', {
              data: Object.entries(sessionData)
                .filter(([key]) => !key.includes('_token') && !key.includes('password'))
                .map(([key, value]) => ({
                  key,
                  value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                })),
            })
          }
        }

        const html = await youch.toHTML({
          title: error.message,
          ide: process.env.IDE || process.env.EDITOR || 'vscode',
        })
        return response.status(500).header('content-type', 'text/html').send(html)
      }
    }

    // Xử lý lỗi token CSRF hết hạn
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 419) {
      session.flash('errors', { form: 'Trang đã hết hạn, vui lòng thử lại' })
      response.redirect().back()
      return
    }

    // Xử lý lỗi không có quyền truy cập
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 401) {
      if (request.header('X-Inertia')) {
        return inertia.location('/login')
      }
      session.flash('errors', { form: 'Vui lòng đăng nhập để tiếp tục' })
      response.redirect('/login')
      return
    }

    // Xử lý lỗi không đủ quyền
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 403) {
      session.flash('errors', { form: 'Bạn không có quyền thực hiện hành động này' })
      response.redirect().back()
      return
    }

    return super.handle(error, ctx)
  }

  /**
   * Report error to logging service or other monitoring tools
   */
  override async report(error: unknown, ctx: HttpContext) {
    // In lỗi đẹp ra terminal trong development mode
    if (!app.inProduction && error instanceof Error) {
      const youch = new Youch(error, ctx.request.request)
      const output = await youch.toJSON()
      console.log(YouchTerminal(output))
    }

    return super.report(error, ctx)
  }
}
