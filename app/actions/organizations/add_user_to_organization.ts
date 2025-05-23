import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

interface AddUserToOrganizationParams {
  organizationId: number
  userId: number
  roleId: number
}

interface AddUserToOrganizationResult {
  success: boolean
  message: string
}

@inject()
export default class AddUserToOrganization {
  constructor(protected ctx: HttpContext) {}

  async handle({
    organizationId,
    userId,
    roleId,
  }: AddUserToOrganizationParams): Promise<AddUserToOrganizationResult> {
    try {
      const currentUser = this.ctx.auth.user!

      // Kiểm tra tổ chức tồn tại
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra người dùng tồn tại
      const userToAdd = await User.find(userId)
      if (!userToAdd) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
        }
      }

      // Sử dụng stored procedure add_user_to_organization_by_superadmin
      try {
        await db.rawQuery('CALL add_user_to_organization_by_superadmin(?, ?, ?, ?)', [
          currentUser.id,
          userId,
          organizationId,
          roleId,
        ])
      } catch (err) {
        // Xử lý lỗi từ stored procedure
        const error = err as Error
        return {
          success: false,
          message: error.message || 'Lỗi khi thêm người dùng vào tổ chức',
        }
      }

      // Tạo thông báo cho người dùng được thêm
      await db.table('notifications').insert({
        user_id: userId,
        title: 'Bạn đã được thêm vào tổ chức',
        message: `Bạn đã được thêm vào tổ chức ${organization.name}`,
        type: 'organization_added',
        related_entity_type: 'organization',
        related_entity_id: organizationId,
        is_read: 0,
        created_at: new Date(),
      })

      return {
        success: true,
        message: 'Đã thêm người dùng vào tổ chức thành công',
      }
    } catch (error) {
      console.error('Lỗi khi thêm người dùng vào tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi thêm người dùng vào tổ chức',
      }
    }
  }
}
