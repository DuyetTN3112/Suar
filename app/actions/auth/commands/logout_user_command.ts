import { BaseCommand } from '../../shared/base_command.js'
import type { LogoutUserDTO } from '../dtos/logout_user_dto.js'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * LogoutUserCommand
 *
 * Logs out the currently authenticated user.
 * This is a Command (Write operation) as it modifies session state.
 *
 * Business Rules:
 * - Clear web guard session
 * - Clear Inertia shared auth props
 * - Optionally clear remember_me cookie
 * - Audit log created
 *
 * Security:
 * - Ensures session is properly invalidated
 * - Clears all authentication artifacts
 */
export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO, void> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Main handler - logs out user and clears session
   */
  async handle(dto: LogoutUserDTO): Promise<void> {
    // 1. Log the logout action BEFORE actually logging out
    // (so we still have access to user info)
    await this.logAudit('logout', 'user', dto.userId, null, {
      timestamp: new Date(),
      ip: dto.ipAddress,
      sessionId: dto.sessionId,
    })

    // 2. Logout from web guard
    await this.logoutFromWebGuard()

    // 3. Clear session data
    this.clearSessionData()

    // 4. Clear Inertia props
    this.clearInertiaAuthProps()

    // 5. Optionally clear remember_me cookie
    // this.ctx.response.clearCookie('remember_web')
  }

  /**
   * Logout from web guard
   */
  private async logoutFromWebGuard(): Promise<void> {
    await this.ctx.auth.use('web').logout()
  }

  /**
   * Clear session data related to authentication
   */
  private clearSessionData(): void {
    this.ctx.session.forget('auth')
  }

  /**
   * Clear Inertia shared props for authentication
   */
  private clearInertiaAuthProps(): void {
    if (this.ctx.inertia) {
      this.ctx.inertia.share({
        auth: {
          user: null,
        },
      })
    }
  }
}
