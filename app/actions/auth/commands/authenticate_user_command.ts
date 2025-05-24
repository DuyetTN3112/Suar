import { BaseCommand } from '../../shared/base_command.js'
import type { AuthenticateUserDTO } from '../dtos/index.js'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import limiter from '@adonisjs/limiter/services/main'
import type { HttpContext } from '@adonisjs/core/http'
import { AuthLogger } from '../../../helpers/auth_logger.js'

/**
 * AuthenticateUserCommand
 *
 * Authenticates a user with email and password.
 * This is a Command (Write operation) as it creates a session.
 *
 * Business Rules:
 * - Password verification (plain text in dev, hash in production)
 * - Rate limiting: 10 attempts per 15 minutes per IP+email
 * - Block duration: 5 minutes after rate limit exceeded
 * - Session-based authentication (web guard)
 * - Audit log created on successful login
 *
 * Security Improvements:
 * - ✅ Rate limiting to prevent brute force attacks
 * - ✅ IP-based tracking
 * - ⚠️ Password hashing DISABLED for development (set USE_PASSWORD_HASH = true in production!)
 */
export default class AuthenticateUserCommand extends BaseCommand<AuthenticateUserDTO, User> {
  // 🔧 DEVELOPMENT MODE: Set to true to enable password hashing in production
  private readonly USE_PASSWORD_HASH = false
  private limiter = limiter.use({
    requests: 10, // 10 attempts
    duration: '15 minutes',
    blockDuration: '5 minutes',
  })

  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Main handler - authenticates user and creates session
   */
  async handle(dto: AuthenticateUserDTO): Promise<User> {
    AuthLogger.loginAttempt(dto.email, dto.remember, dto.ipAddress)

    try {
      // 1. Rate limiting check
      const user = await this.authenticateWithRateLimit(dto)

      // 2. Create session
      await this.createSession(user, dto.remember)

      // 3. Clear rate limits on success
      await this.clearRateLimits(dto.getRateLimitKey())

      // 4. Log successful authentication
      await this.logAudit('login', 'user', user.id, null, {
        email: user.email,
        ip: dto.ipAddress,
        remember: dto.remember,
      })

      AuthLogger.userLogin(user.id, user.email, 'email')
      return user
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      AuthLogger.loginFailure(dto.email, errorMsg)
      throw error
    }
  }

  /**
   * Authenticate user with rate limiting
   * Uses limiter.penalize() to track failed attempts
   */
  private async authenticateWithRateLimit(dto: AuthenticateUserDTO): Promise<User> {
    const key = dto.getRateLimitKey()

    try {
      const [error, user] = await this.limiter.penalize(key, async () => {
        return await this.verifyCredentials(dto)
      })

      if (error) {
        // Rate limit exceeded or authentication failed
        throw new Error('Thông tin đăng nhập không chính xác')
      }

      return user!
    } catch (err) {
      throw new Error('Thông tin đăng nhập không chính xác')
    }
  }

  /**
   * Verify user credentials
   * DEVELOPMENT MODE: Plain text password comparison (for faster dev)
   * PRODUCTION MODE: Hash verification (set USE_PASSWORD_HASH = true)
   */
  private async verifyCredentials(dto: AuthenticateUserDTO): Promise<User> {
    // 1. Find user by email
    const user = await User.findBy('email', dto.email)
    if (!user) {
      AuthLogger.loginFailure(dto.email, 'User not found')
      throw new Error('Tài khoản không tồn tại')
    }

    // 2. Verify password
    let isPasswordValid: boolean

    if (this.USE_PASSWORD_HASH) {
      // 🔒 PRODUCTION: Use secure hash verification
      isPasswordValid = await hash.verify(user.password, dto.password)
    } else {
      // 🔧 DEVELOPMENT: Use plain text comparison for faster iteration
      // ⚠️ WARNING: This is INSECURE! Only use in development!
      isPasswordValid = user.password === dto.password
    }

    if (!isPasswordValid) {
      AuthLogger.loginFailure(dto.email, 'Invalid password')
      throw new Error('Mật khẩu không đúng')
    }

    // 3. Check user status
    await user.load('status')
    if (user.status && user.status.name !== 'active') {
      AuthLogger.loginFailure(dto.email, `User status: ${user.status.name}`)
      throw new Error('Tài khoản đã bị khóa hoặc chưa được kích hoạt')
    }

    return user
  }

  /**
   * Create session for authenticated user
   */
  private async createSession(user: User, remember: boolean): Promise<void> {
    await this.ctx.auth.use('web').login(user, remember)
  }

  /**
   * Clear rate limits for successful login
   */
  private async clearRateLimits(key: string): Promise<void> {
    await this.limiter.delete(key)
  }
}
