import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { OrganizationUser } from '#models/organization_user'

interface InviteUserParams {
  organizationId: number
  email: string
  roleId?: number
}

interface InviteUserResult {
  success: boolean
  message: string
  invitation?: OrganizationUser
}

@inject()
export default class InviteUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ organizationId, email, roleId = 3 }: InviteUserParams): Promise<InviteUserResult> {
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

      // Kiểm tra quyền của người mời (phải là admin hoặc superadmin)
      const currentUserRole = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', currentUser.id)
        .where('status', 'approved')
        .first()

      if (!currentUserRole || ![1, 2].includes(currentUserRole.role_id)) {
        return {
          success: false,
          message: 'Bạn không có quyền mời người dùng vào tổ chức',
        }
      }

      // Tìm người dùng được mời
      const invitedUser = await User.findBy('email', email)
      if (!invitedUser) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng với email này',
        }
      }

      // Kiểm tra người dùng đã trong tổ chức chưa
      const existingMember = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', invitedUser.id)
        .first()

      if (existingMember) {
        if (existingMember.status === 'approved') {
          return {
            success: false,
            message: 'Người dùng đã là thành viên của tổ chức',
          }
        } else if (existingMember.status === 'pending') {
          return {
            success: false,
            message: 'Người dùng đã có lời mời hoặc yêu cầu tham gia tổ chức đang chờ xử lý',
          }
        }
      }

      // Sử dụng stored procedure invite_user_to_organization
      try {
        await db.rawQuery('CALL invite_user_to_organization(?, ?, ?)', [
          currentUser.id,
          invitedUser.id,
          organizationId,
        ])
      } catch (err) {
        // Xử lý lỗi từ stored procedure
        const error = err as Error
        return {
          success: false,
          message: error.message || 'Lỗi khi mời người dùng vào tổ chức',
        }
      }

      // Lấy thông tin lời mời vừa tạo
      const invitation = await OrganizationUser.query()
        .where('organization_id', organizationId)
        .where('user_id', invitedUser.id)
        .first()

      // Tạo thông báo cho người được mời
      await db.table('notifications').insert({
        user_id: invitedUser.id,
        title: 'Lời mời tham gia tổ chức',
        message: `Bạn được mời tham gia tổ chức ${organization.name}`,
        type: 'organization_invitation',
        related_entity_type: 'organization',
        related_entity_id: organizationId,
        is_read: 0,
        created_at: new Date(),
      })

      return {
        success: true,
        message: 'Đã gửi lời mời tham gia tổ chức thành công',
        invitation: invitation as OrganizationUser,
      }
    } catch (error) {
      console.error('Lỗi khi mời người dùng vào tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi mời người dùng vào tổ chức',
      }
    }
  }
}
