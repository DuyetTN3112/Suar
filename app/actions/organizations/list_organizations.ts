import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

@inject()
export default class ListOrganizations {
  constructor(protected ctx: HttpContext) {}
  // Dùng cho debug trong dev mode
  private isDevMode = env.get('NODE_ENV') === 'development'
  private log(...args: any[]) {
    if (this.isDevMode) {
      console.log('[ListOrganizations]', ...args)
    }
  }

  async handle() {
    const user = this.ctx.auth.user!
    this.log('Đang lấy tổ chức của user ID:', user.id)

    const organizations = await db
      .from('organizations')
      .join('organization_users', 'organizations.id', '=', 'organization_users.organization_id')
      .where('organization_users.user_id', user.id)
      .whereNull('organizations.deleted_at')
      .select('organizations.*')
      .orderBy('organizations.id', 'asc') // Sắp xếp theo ID tăng dần

    this.log('Tìm thấy', organizations.length, 'tổ chức')
    // Log chi tiết từng tổ chức để debug
    organizations.forEach((org, index) => {
      this.log(`Tổ chức #${index + 1}:`, {
        id: org.id,
        name: org.name,
        owner_id: org.owner_id,
      })
    })

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
