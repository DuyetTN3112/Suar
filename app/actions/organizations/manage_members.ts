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
      .select('role_id')
      .first()

    if (!userRole || ![1, 2].includes(userRole.role_id)) {
      return {
        success: false,
        message: 'Bạn không có quyền quản lý thành viên',
      }
    }

    // Lấy danh sách thành viên và vai trò
    await organization.load('users', (query) => {
      query.preload('role')
    })

    // Lấy thông tin về vai trò
    const roles = await UserRole.all()

    return {
      success: true,
      organization,
      roles,
    }
  }
}
