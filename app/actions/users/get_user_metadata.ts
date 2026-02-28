import { SystemRoleName, UserStatusName } from '#constants'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * v3: system_roles + user_statuses tables removed.
 * Return static enum values instead of DB queries.
 */
@inject()
export default class GetUserMetadata {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const roles = Object.values(SystemRoleName).map((name) => ({ name }))
    const statuses = Object.values(UserStatusName).map((name) => ({ name }))
    return {
      roles,
      statuses,
    }
  }
}
