import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface ProcessJoinRequestParams {
  organizationId: number
  userId: number
  action: 'approve' | 'reject'
}

interface ProcessJoinRequestResult {
  success: boolean
  message: string
}

@inject()
export default class ProcessJoinRequest {
  constructor(protected ctx: HttpContext) {}

  async handle({
    organizationId,
    userId,
    action,
  }: ProcessJoinRequestParams): Promise<ProcessJoinRequestResult> {
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

      // Kiểm tra quyền của người xử lý yêu cầu (phải là admin hoặc superadmin)
      const currentUserRole = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', currentUser.id)
        .where('status', 'approved')
        .first()

      if (!currentUserRole || ![1, 2].includes(currentUserRole.role_id)) {
        return {
          success: false,
          message: 'Bạn không có quyền xử lý yêu cầu tham gia tổ chức',
        }
      }

      // Kiểm tra yêu cầu tồn tại
      const pendingRequest = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', userId)
        .where('status', 'pending')
        .first()

      if (!pendingRequest) {
        return {
          success: false,
          message: 'Không tìm thấy yêu cầu tham gia tổ chức đang chờ xử lý',
        }
      }

      // Sử dụng stored procedure manage_membership_request
      try {
        await db.rawQuery('CALL manage_membership_request(?, ?, ?, ?)', [
          currentUser.id,
          userId,
          organizationId,
          action,
        ])
      } catch (err) {
        // Xử lý lỗi từ stored procedure
        const error = err as Error
        return {
          success: false,
          message:
            error.message ||
            `Lỗi khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu tham gia tổ chức`,
        }
      }

      // Tạo thông báo cho người đã gửi yêu cầu
      await db.table('notifications').insert({
        user_id: userId,
        title: `Yêu cầu tham gia tổ chức đã được ${action === 'approve' ? 'chấp nhận' : 'từ chối'}`,
        message: `Yêu cầu tham gia tổ chức ${organization.name} của bạn đã được ${action === 'approve' ? 'chấp nhận' : 'từ chối'}`,
        type: 'organization_request_processed',
        related_entity_type: 'organization',
        related_entity_id: organizationId,
        is_read: 0,
        created_at: new Date(),
      })

      return {
        success: true,
        message: `Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu tham gia tổ chức thành công`,
      }
    } catch (error) {
      console.error('Lỗi khi xử lý yêu cầu tham gia tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xử lý yêu cầu tham gia tổ chức',
      }
    }
  }
}
