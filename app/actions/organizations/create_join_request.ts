import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import User from '#models/user'
import { OrganizationUser } from '#models/organization_user'
import db from '@adonisjs/lucid/services/db'

interface CreateJoinRequestParams {
  organizationId: number
  userId?: number
  note?: string
  requesterId?: number
}

interface CreateJoinRequestResult {
  success: boolean
  message: string
  joinRequest?: OrganizationUser
}

export default class CreateJoinRequest {
  constructor(protected ctx: HttpContext) {}

  async handle({
    organizationId,
    userId,
    note,
    requesterId,
  }: CreateJoinRequestParams): Promise<CreateJoinRequestResult> {
    try {
      const user = this.ctx.auth.user!
      // Nếu không có userId được chỉ định, lấy userId của người dùng hiện tại
      const targetUserId = userId || user.id
      // Nếu không có requesterId, lấy id của người dùng hiện tại
      const actualRequesterId = requesterId || user.id

      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra người dùng đã là thành viên của tổ chức chưa
      const existingMembership = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', targetUserId)
        .first()

      if (existingMembership) {
        if (existingMembership.status === 'approved') {
          return {
            success: false,
            message: 'Người dùng đã là thành viên của tổ chức này',
          }
        } else if (existingMembership.status === 'pending') {
          return {
            success: false,
            message: 'Đã có yêu cầu tham gia tổ chức đang chờ xử lý',
          }
        }
      }

      // Tạo yêu cầu tham gia mới
      const joinRequest = await OrganizationUser.create({
        organization_id: organizationId,
        user_id: targetUserId,
        invited_by: targetUserId === actualRequesterId ? null : actualRequesterId,
        status: 'pending',
        role_id: 3, // Mặc định là user thường
      })

      return {
        success: true,
        message: 'Đã gửi yêu cầu tham gia tổ chức thành công',
        joinRequest,
      }
    } catch (error) {
      console.error('Lỗi khi tạo yêu cầu tham gia tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi tạo yêu cầu tham gia tổ chức',
      }
    }
  }
}
