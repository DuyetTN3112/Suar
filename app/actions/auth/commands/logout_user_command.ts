import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { LogoutUserDTO } from '../dtos/request/logout_user_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'

export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO> {
  async handle(dto: LogoutUserDTO): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'logout',
        entity_type: 'user',
        entity_id: dto.userId,
        old_values: null,
        new_values: {
          timestamp: new Date(),
          ip: dto.ipAddress,
          sessionId: dto.sessionId,
        },
      })
    }

    // Emit user:logout event
    void emitter.emit('user:logout', {
      userId: dto.userId,
      ip: dto.ipAddress || '',
    })
  }
}
