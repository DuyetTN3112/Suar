import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface GetOrganizationResult {
  success: boolean
  message?: string
  organization?: Organization
  userRole?: {
    roleName: string
    roleId: number
  }
}

@inject()
export default class GetOrganization {
  constructor(protected ctx: HttpContext) {}

  async handle(id: number): Promise<GetOrganizationResult> {
    const user = this.ctx.auth.user!
    const organization = await Organization.find(id)
    if (!organization) {
      return {
        success: false,
        message: 'Không tìm thấy tổ chức',
      }
    }

    // Kiểm tra user có phải là thành viên của tổ chức không
    const isMember = await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', user.id)
      .first()

    if (!isMember) {
      return {
        success: false,
        message: 'Bạn không phải là thành viên của tổ chức này',
      }
    }

    // Lấy danh sách thành viên và quyền
    await organization.load('users', (query) => {
      query.preload('role')
    })
    // Lấy role của user trong tổ chức
    const userRole = await db
      .from('organization_users')
      .join('user_roles', 'organization_users.role_id', '=', 'user_roles.id')
      .where('organization_id', organization.id)
      .where('user_id', user.id)
      .select('user_roles.name as role_name', 'organization_users.role_id')
      .first()

    return {
      success: true,
      organization,
      userRole: userRole
        ? {
            roleName: userRole.role_name,
            roleId: userRole.role_id,
          }
        : undefined,
    }
  }
}
