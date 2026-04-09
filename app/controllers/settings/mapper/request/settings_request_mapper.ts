import type { HttpContext } from '@adonisjs/core/http'
import { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildUpdateAccountSettingsDTO(
  request: HttpContext['request'],
  userId: string,
  fallbackEmail: string | null
): UpdateUserProfileDTO {
  return new UpdateUserProfileDTO(
    userId,
    undefined,
    toOptionalString(request.input('email') as unknown) ?? fallbackEmail ?? undefined
  )
}

export function buildUpdateProfileSettingsDTO(
  request: HttpContext['request'],
  userId: string
): UpdateUserProfileDTO {
  return new UpdateUserProfileDTO(
    userId,
    toOptionalString(request.input('username') as unknown),
    toOptionalString(request.input('email') as unknown)
  )
}
