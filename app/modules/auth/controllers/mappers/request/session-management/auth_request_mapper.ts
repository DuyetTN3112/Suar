import type { HttpContext } from '@adonisjs/core/http'

import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
