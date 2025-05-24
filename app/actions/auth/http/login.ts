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

    try {
      const [error, foundUser] = await this.limit.penalize(key, async () => {
        const user = await User.findBy('email', data.email)
        if (!user) {
          throw new Error('Tài khoản không tồn tại')
        }
        // Kiểm tra trực tiếp mật khẩu - plain text
        if (user.password !== data.password) {
          throw new Error('Mật khẩu không đúng')
        }
        return user
      })

      if (error) {
        this.ctx.session.flashAll()
        this.ctx.session.flashErrors({
          email: 'Thông tin đăng nhập không chính xác',
        })
        return null
      }

      // Thực hiện đăng nhập
      await this.ctx.auth.use('web').login(foundUser)
      return foundUser
    } catch (err) {
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
