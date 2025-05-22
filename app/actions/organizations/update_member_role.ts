import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface UpdateMemberRoleParams {
  organizationId: number
  memberId: number
  roleId: number
}

interface UpdateMemberRoleResult {
  success: boolean
  message: string
}

@inject()
export default class UpdateMemberRole {
  constructor(protected ctx: HttpContext) {}

  async handle({
    organizationId,
    memberId,
    roleId,
  }: UpdateMemberRoleParams): Promise<UpdateMemberRoleResult> {
    try {
      const user = this.ctx.auth.user!
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ admin hoặc owner mới có thể cập nhật vai trò)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('role_id')
        .first()

      if (!userRole || ![1, 2].includes(userRole.role_id)) {
        return {
          success: false,
          message: 'Bạn không có quyền cập nhật vai trò thành viên',
        }
      }

      // Cập nhật vai trò
      await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .update({
          role_id: roleId,
          updated_at: new Date(),
        })

      return {
        success: true,
        message: 'Đã cập nhật vai trò thành công',
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật vai trò:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật vai trò',
      }
    }
  }
}
