/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Limiter sử dụng store được chỉ định trong config/limiter.ts (default)
 * 120 requests mỗi phút cho mỗi IP (cho phép duyệt thoải mái)
 */
export const throttle = limiter.define('global', (ctx: HttpContext) => {
  return limiter.allowRequests(120).every('1 minute').usingKey(`global:${ctx.request.ip()}`)
})

/**
 * Limiter cho API
 * 60 requests mỗi phút cho mỗi IP
 */
export const apiThrottle = limiter.define('api', (ctx: HttpContext) => {
  return limiter.allowRequests(60).every('1 minute').usingKey(`api:${ctx.request.ip()}`)
})

/**
 * Limiter cho login
 * 5 yêu cầu đăng nhập mỗi phút cho mỗi IP
 */
export const loginThrottle = limiter.define('login', (ctx: HttpContext) => {
  return limiter.allowRequests(5).every('1 minute').usingKey(`login:${ctx.request.ip()}`)
})
