import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'

import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import Youch from 'youch'
import YouchTerminal from 'youch-terminal'

interface HttpError {
  status: number
  message?: string
}

interface YouchInstance {
  toHTML: () => Promise<string>
  toJSON: () => Promise<Record<string, unknown>>
}

const isHttpError = (err: unknown): err is HttpError => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as HttpError).status === 'number'
  )
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected override debug = !app.inProduction
  protected override renderStatusPages = true

  protected override statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  override async handle(error: unknown, ctx: HttpContext): Promise<void> {
    const { request, response, session, inertia } = ctx

    if (!app.inProduction && error instanceof Error) {
      const isApiRequest = request.url().startsWith('/api/')
      const isInertiaRequest = request.header('X-Inertia')

      if (!isInertiaRequest || isApiRequest) {
        const youch = new Youch(error, request.request) as unknown as YouchInstance

        const html = await youch.toHTML()
        response.status(500).header('content-type', 'text/html').send(html)
        return
      }
    }

    if (isHttpError(error) && error.status === 419) {
      session.flash('errors', { form: 'Trang đã hết hạn, vui lòng thử lại' })
      response.redirect().back()
      return
    }

    if (isHttpError(error) && error.status === 401) {
      if (request.header('X-Inertia')) {
        await inertia.location('/login')
        return
      }
      session.flash('errors', { form: 'Vui lòng đăng nhập để tiếp tục' })
      response.redirect('/login')
      return
    }

    if (isHttpError(error) && error.status === 403) {
      session.flash('errors', { form: 'Bạn không có quyền thực hiện hành động này' })
      response.redirect().back()
      return
    }

    await super.handle(error, ctx)
  }

  override async report(error: unknown, ctx: HttpContext): Promise<void> {
    if (!app.inProduction && error instanceof Error) {
      const youch = new Youch(error, ctx.request.request) as unknown as YouchInstance
      const output = await youch.toJSON()
      console.log(YouchTerminal(output))
    }

    await super.report(error, ctx)
  }
}
