import { BaseCommand } from '../../shared/base_command.js'
import type { LogoutUserDTO } from '../dtos/logout_user_dto.js'
import emitter from '@adonisjs/core/services/emitter'

export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO> {
  async handle(dto: LogoutUserDTO): Promise<void> {
    await this.logAudit('logout', 'user', dto.userId, null, {
      timestamp: new Date(),
      ip: dto.ipAddress,
      sessionId: dto.sessionId,
    })

    await this.logoutFromWebGuard()

    this.clearSessionData()

    this.clearInertiaAuthProps()

    // Emit user:logout event
    void emitter.emit('user:logout', {
      userId: dto.userId,
      ip: dto.ipAddress || '',
    })
  }

  private async logoutFromWebGuard(): Promise<void> {
    await this.ctx.auth.use('web').logout()
  }

  private clearSessionData(): void {
    this.ctx.session.forget('auth')
  }

  private clearInertiaAuthProps(): void {
    this.ctx.inertia.share({
      auth: {
        user: null,
      },
    })
  }
}
