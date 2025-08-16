import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../../shared/base_command.js'
import type { LogoutUserDTO } from '../dtos/request/logout_user_dto.js'

export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO> {
  async handle(dto: LogoutUserDTO): Promise<void> {
    await this.logAudit('logout', 'user', dto.userId, null, {
      timestamp: new Date(),
      ip: dto.ipAddress,
      sessionId: dto.sessionId,
    })

    // Emit user:logout event
    void emitter.emit('user:logout', {
      userId: dto.userId,
      ip: dto.ipAddress || '',
    })
  }
}
