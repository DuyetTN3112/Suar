import type { HttpContext } from '@adonisjs/core/http'

import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'

export function buildLogoutUserDTO(
  request: HttpContext['request'],
  userId: string,
  sessionId: string | undefined
): LogoutUserDTO {
  return new LogoutUserDTO(omitUndefined({
    userId,
    sessionId,
    ipAddress: request.ip(),
  }))
}
