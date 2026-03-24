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
import env from '#start/env'

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
 * Limiter cho login - SMART STRATEGY
 * 
 * Development: Unlimited (để test thoải mái)
 * Production: 30 requests/minute per IP (cho phép nhiều users cùng corporate network)
 * 
 * OAuth flow: redirect + callback = 2 requests
 * Vậy 30 req/min = ~15 login attempts/minute per IP
 * 
 * Corporate network với 100 users: Mỗi user có ~15 attempts trong 100 phút (1.67 giờ)
 * → Đủ để không block nhưng vẫn chống brute-force
 */
export const loginThrottle = limiter.define('login', (ctx: HttpContext) => {
  const isDevelopment = env.get('NODE_ENV') === 'development'
  
  if (isDevelopment) {
    // Development: No limit
    return limiter.allowRequests(999999).every('1 minute').usingKey(`login:${ctx.request.ip()}`)
  }
  
  // Production: 30 requests/minute per IP
  return limiter.allowRequests(30).every('1 minute').usingKey(`login:${ctx.request.ip()}`)
})
