import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import { inject } from '@adonisjs/core'

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
      if (!organizationId || !memberId) {
        return {
          success: false,
          message: 'Thiếu thông tin cần thiết',
        }
      }
      const user = this.ctx.auth.user
      if (!user) {
        return {
          success: false,
          message: 'Bạn chưa đăng nhập',
        }
      }
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

      // Kiểm tra quyền (chỉ superadmin của tổ chức mới có thể xóa thành viên)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('role_id')
        .first()

      // Chỉ có superadmin tổ chức (1) mới có quyền xóa thành viên
      if (!userRole || userRole.role_id !== 1) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa thành viên',
        }
      }

      // Kiểm tra thành viên có tồn tại trong tổ chức không
      const memberExists = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .first()

      if (!memberExists) {
        return {
          success: false,
          message: 'Thành viên này không thuộc tổ chức',
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
