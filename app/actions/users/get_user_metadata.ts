import SystemRole from '#models/system_role'
import UserStatus from '#models/user_status'
import type { HttpContext } from '@adonisjs/core/http'
export default class GetUserMetadata {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const roles = await SystemRole.all()
    const statuses = await UserStatus.all()
    return {
      roles,
      statuses,
    }
  }
}
