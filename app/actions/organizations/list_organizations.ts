import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
@inject()
export default class ListOrganizations {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const user = this.ctx.auth.user!

    const organizations = await db
      .from('organizations')
      .join('organization_users', 'organizations.id', '=', 'organization_users.organization_id')
      .where('organization_users.user_id', user.id)
      .whereNull('organizations.deleted_at')
      .select('organizations.*')
      .orderBy('organizations.id', 'asc') // Sắp xếp theo ID tăng dần

    for (const org of organizations) {
      org.users = await db
        .from('users')
        .join('organization_users', 'users.id', '=', 'organization_users.user_id')
        .where('organization_users.organization_id', org.id)
        .select('users.*', 'organization_users.role_id')
    }

    return {
      organizations,
    }
  }
}
