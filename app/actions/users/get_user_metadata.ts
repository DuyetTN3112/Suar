import UserRole from '#models/user_role'
import UserStatus from '#models/user_status'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class GetUserMetadata {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const roles = await UserRole.all()
    const statuses = await UserStatus.all()
    return {
      roles,
      statuses,
    }
  }
}
