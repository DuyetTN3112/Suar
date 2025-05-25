import { Logger } from '@adonisjs/core/logger'
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware để đăng ký các binding vào container resolver
 * Điều này cho phép các service trong container truy cập vào HttpContext
 * và các dịch vụ khác trong request lifecycle
 */
export default class ContainerBindingsMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    // Bind HttpContext instance vào container
    ctx.containerResolver.bindValue(HttpContext, ctx)
    // Bind Logger instance vào container
    ctx.containerResolver.bindValue(Logger, ctx.logger)

    return next()
  }
}
