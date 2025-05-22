import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface RemoveMemberParams {
  organizationId: number
  memberId: number
}

interface RemoveMemberResult {
  success: boolean
  message: string
}

@inject()
export default class RemoveMember {
  constructor(protected ctx: HttpContext) {}

  async handle({ organizationId, memberId }: RemoveMemberParams): Promise<RemoveMemberResult> {
    try {
      const user = this.ctx.auth.user!
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Không thể xóa owner
      if (organization.owner_id === memberId) {
        return {
          success: false,
          message: 'Không thể xóa chủ sở hữu khỏi tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ admin hoặc owner mới có thể xóa thành viên)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('role_id')
        .first()

      if (!userRole || ![1, 2].includes(Number(userRole.role_id))) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa thành viên',
        }
      }

      // Xóa thành viên
      await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .delete()

      return {
        success: true,
        message: 'Đã xóa thành viên thành công',
      }
    } catch (error) {
      console.error('Lỗi khi xóa thành viên:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xóa thành viên',
      }
    }
  }
}
