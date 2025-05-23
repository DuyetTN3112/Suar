import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import { Exception } from '@adonisjs/core/exceptions'

@inject()
export default class WebLogin {
  constructor(protected ctx: HttpContext) {}

  async handle({ email, password, remember }: { email: string; password: string; remember?: boolean }) {
    // Rate limiting
    const key = `login_${email}_${this.ctx.request.ip()}`
    const throttle = limiter.createThrottle('auth')
    
    const { status, consumedTokens, remainingTokens, msBeforeNext } = await throttle.attempt(key)

    if (status === 'tooManyAttempts') {
      throw new Exception(
        `Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ${Math.ceil(msBeforeNext / 1000 / 60)} phút.`,
        {
          code: 'E_TOO_MANY_REQUESTS',
          status: 429,
        }
      )
    }

    // Login attempt
    try {
      await this.ctx.auth.use('web').attempt(email, password, remember)
      await this.clearRateLimits(email)
      return { success: true }
    } catch (error) {
      throw new Exception('Email hoặc mật khẩu không chính xác.', {
        code: 'E_INVALID_CREDENTIALS',
        status: 400,
      })
    }
  }

  async clearRateLimits(email: string) {
    const key = `login_${email}_${this.ctx.request.ip()}`
    await limiter.deleteKey(key)
  }
} 