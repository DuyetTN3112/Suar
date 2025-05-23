import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface PendingRequest {
  user_id: number
  full_name: string
  email: string
  invited_by: number | null
  inviter_name: string | null
  created_at: string
}

interface GetPendingRequestsResult {
  success: boolean
  message?: string
  organization?: Organization
  pendingRequests?: PendingRequest[]
}

@inject()
export default class GetPendingRequests {
  constructor(protected ctx: HttpContext) {}

  async handle(organizationId: number): Promise<GetPendingRequestsResult> {
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

      // Kiểm tra quyền (chỉ admin hoặc superadmin mới có thể xem yêu cầu chờ duyệt)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', currentUser.id)
        .where('status', 'approved')
        .select('role_id')
        .first()

      if (!userRole || ![1, 2].includes(userRole.role_id)) {
        return {
          success: false,
          message: 'Bạn không có quyền xem danh sách yêu cầu tham gia tổ chức',
        }
      }

      // Sử dụng stored procedure get_pending_requests
      const [result] = await db.rawQuery('CALL get_pending_requests(?)', [organizationId])
      // Chuẩn hóa kết quả từ stored procedure
      const pendingRequests = Array.isArray(result[0]) ? result[0] : []

      return {
        success: true,
        organization,
        pendingRequests,
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách yêu cầu tham gia tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi lấy danh sách yêu cầu tham gia tổ chức',
      }
    }
  }
}
