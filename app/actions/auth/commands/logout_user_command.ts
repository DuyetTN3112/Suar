import { BaseCommand } from '../../shared/base_command.js'
import type { LogoutUserDTO } from '../dtos/logout_user_dto.js'
import type { HttpContext } from '@adonisjs/core/http'

export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO, void> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: LogoutUserDTO): Promise<void> {
    await this.logAudit('logout', 'user', dto.userId, null, {
      timestamp: new Date(),
      ip: dto.ipAddress,
      sessionId: dto.sessionId,
    })

    await this.logoutFromWebGuard()

    this.clearSessionData()

    this.clearInertiaAuthProps()
  }

  private async logoutFromWebGuard(): Promise<void> {
    await this.ctx.auth.use('web').logout()
  }

  private clearSessionData(): void {
    this.ctx.session.forget('auth')
  }

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
