import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

interface AddMemberParams {
  organizationId: string
  email: string
  roleId: number
}

interface AddMemberResult {
  success: boolean
  message: string
}

@inject()
export default class AddMember {
  constructor(protected ctx: HttpContext) {}

  async handle({ organizationId, email, roleId }: AddMemberParams): Promise<AddMemberResult> {
    try {
      const user = this.ctx.auth.user!
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ admin hoặc owner mới có thể thêm thành viên)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('role_id')
        .first()

      if (!userRole || ![1, 2].includes(userRole.role_id)) {
        return {
          success: false,
          message: 'Bạn không có quyền thêm thành viên',
        }
      }

      // Lấy thông tin thành viên cần thêm
      const memberToAdd = await User.findBy('email', email)

      if (!memberToAdd) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng với email này',
        }
      }

      // Kiểm tra xem đã là thành viên chưa
      const existingMember = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberToAdd.id)
        .first()

      if (existingMember) {
        if (existingMember.status === 'approved') {
          return {
            success: false,
            message: 'Người dùng này đã là thành viên của tổ chức',
          }
        } else if (existingMember.status === 'pending') {
          // Cập nhật trạng thái nếu đã có yêu cầu đang chờ
          await db
            .from('organization_users')
            .where('organization_id', organization.id)
            .where('user_id', memberToAdd.id)
            .update({
              status: 'approved',
              role_id: roleId || 3,
              invited_by: user.id,
              updated_at: new Date(),
            })

          return {
            success: true,
            message: 'Đã duyệt và thêm thành viên thành công',
          }
        }
      }

      // Thêm thành viên mới
      await db.table('organization_users').insert({
        organization_id: organization.id,
        user_id: memberToAdd.id,
        role_id: roleId || 3, // Mặc định là user thường
        status: 'approved',
        invited_by: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      })

      return {
        success: true,
        message: 'Đã thêm thành viên thành công',
      }
    } catch (error) {
      console.error('Lỗi khi thêm thành viên:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi thêm thành viên',
      }
    }
  }
}
