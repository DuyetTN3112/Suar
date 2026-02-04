import type { HttpContext } from '@adonisjs/core/http'

import { LogoutUserDTO } from '#actions/auth/dtos/request/logout_user_dto'
import type { DatabaseId } from '#types/database'

export function buildLogoutUserDTO(
  request: HttpContext['request'],
  userId: DatabaseId,
  sessionId: string | undefined
): LogoutUserDTO {
  return new LogoutUserDTO({
    userId,
    sessionId,
    ipAddress: request.ip(),
  })
}
