import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import UserRole from '#models/user_role'
import db from '@adonisjs/lucid/services/db'

interface ManageMembersResult {
  success: boolean
  message?: string
  organization?: Organization
  roles?: UserRole[]
  members?: any[]
  userRole?: number
}

@inject()
export default class ManageMembers {
  constructor(protected ctx: HttpContext) {}

  async handle(id: string): Promise<ManageMembersResult> {
    const user = this.ctx.auth.user!
    const organization = await Organization.find(id)
    if (!organization) {
      return {
        success: false,
        message: 'Không tìm thấy tổ chức',
      }
    }

    // Kiểm tra quyền (chỉ admin hoặc owner mới có thể quản lý thành viên)
    const userRole = await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', user.id)
      .where('status', 'approved')
      .select('role_id')
      .first()

    if (!userRole || ![1, 2].includes(userRole.role_id)) {
      return {
        success: false,
        message: 'Bạn không có quyền quản lý thành viên',
      }
    }

    // Lấy danh sách thành viên đã được duyệt
    const members = await db
      .from('users')
      .join('organization_users', 'users.id', '=', 'organization_users.user_id')
      .join('user_roles', 'user_roles.id', '=', 'organization_users.role_id')
      .where('organization_users.organization_id', organization.id)
      .where('organization_users.status', 'approved')
      .whereNull('users.deleted_at')
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.full_name',
        'users.email',
        'users.username',
        'organization_users.role_id',
        'user_roles.name as role_name'
      )

    // Lấy thông tin về vai trò
    const roles = await UserRole.all()

    return {
      success: true,
      organization,
      roles,
      members,
      userRole: userRole.role_id,
    }
  }
}
