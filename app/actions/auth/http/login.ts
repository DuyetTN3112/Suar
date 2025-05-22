import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'

type LoginData = {
  email: string
  password: string
  remember: boolean
}

/**
 * Service for handling login functionality
 */
export default class Login {
  constructor(protected ctx: HttpContext) {}

  get limit() {
    return limiter.use({
      requests: 1000,
      duration: '1 hour',
      blockDuration: '1 minute',
    })
  }

  async handle({ data }: { data: LoginData }) {
    const key = this.getRateKey(data.email)
    console.log('[LOGIN] Attempting login for:', data.email)

    try {
      const [error, foundUser] = await this.limit.penalize(key, async () => {
        const user = await User.findBy('email', data.email)
        if (!user) {
          console.log('[LOGIN] User not found for email:', data.email)
          throw new Error('Tài khoản không tồn tại')
        }
        // Kiểm tra trực tiếp mật khẩu - plain text
        console.log('[LOGIN] Comparing passwords:', {
          dbPassword: user.password,
          inputPassword: data.password,
          match: user.password === data.password,
        })
        if (user.password !== data.password) {
          console.log('[LOGIN] Password does not match')
          throw new Error('Mật khẩu không đúng')
        }
        return user
      })

      if (error) {
        console.log('[LOGIN] Authentication error:', error.message)
        this.ctx.session.flashAll()
        this.ctx.session.flashErrors({
          email: 'Thông tin đăng nhập không chính xác',
        })
        return null
      }

      // Kiểm tra session trước khi login
      console.log('[LOGIN] Session before login:', {
        sessionId: this.ctx.session.sessionId,
        hasSession: !!this.ctx.session,
      })
      // Thực hiện đăng nhập
      await this.ctx.auth.use('web').login(foundUser, data.remember)
      // Kiểm tra session sau khi login
      console.log('[LOGIN] Session after login:', {
        sessionId: this.ctx.session.sessionId,
        userId: foundUser.id,
      })
      return foundUser
    } catch (err) {
      console.error('[LOGIN] Unexpected error:', err)
      return null
    }
  }

  getRateKey(email: string) {
    return `login_${this.ctx.request.ip()}_${email}`
  }

  async clearRateLimits(email: string) {
    return this.limit.delete(this.getRateKey(email))
  }
}
