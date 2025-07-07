import type { HttpContext } from '@adonisjs/core/http'

import type { UpdateCustomRolesDTO } from '#actions/organization/access/commands/update_custom_roles_command'

export function buildUpdateCustomRolesDTO(request: HttpContext['request']): UpdateCustomRolesDTO {
  const customRoles =
    (request.input('custom_roles') as unknown) ??
    (request.input('roles') as unknown) ??
    (request.input('customRoles') as unknown) ??
    []

  return {
    custom_roles: customRoles,
  }
}
