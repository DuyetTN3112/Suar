import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface SwitchOrganizationParams {
  organizationId: number
}

interface SwitchOrganizationResult {
  success: boolean
  message: string
  organization?: Organization
  role?: {
    id: number
    name: string
  }
}

@inject()
export default class SwitchOrganization {
  constructor(protected ctx: HttpContext) {}

  async handle({ organizationId }: { organizationId: number }) {
    try {
      // Kiểm tra nếu organizationId rỗng
      if (!organizationId) {
        return { success: false, message: 'ID tổ chức không được để trống' }
      }
      const user = this.ctx.auth.user!
      
      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(organizationId)
      if (!organization) {
        return { success: false, message: 'Không tìm thấy tổ chức' }
      }
      
      // Kiểm tra người dùng có quyền truy cập tổ chức không
      const hasAccess = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .first()
        
      if (!hasAccess) {
        return { success: false, message: 'Bạn không có quyền truy cập tổ chức này' }
      }
      
      // Không cần chuyển đổi ID sang kiểu số nữa vì đã là số
      const orgIdNumeric = organizationId
      
      // Cập nhật session - lưu dưới dạng số
      this.ctx.session.put('current_organization_id', orgIdNumeric)
      
      // Đảm bảo session được lưu
      await this.ctx.session.commit()
      
      // Cập nhật current_organization_id trong database - lưu dưới dạng số
      try {
        await user.merge({ current_organization_id: orgIdNumeric }).save()
      } catch (dbError) {
        console.error('Lỗi khi cập nhật database:', dbError.message)
        // Lỗi database không gây lỗi toàn bộ thao tác, vì session đã được cập nhật
      }

      // Tải lại thông tin của user từ database để đảm bảo dữ liệu mới nhất
      await user.refresh()

      return {
        success: true,
        message: `Đã chuyển sang tổ chức "${organization.name}"`,
        organization,
      }
    } catch (error) {
      console.error('Lỗi chuyển đổi tổ chức:', error.message)
      return { success: false, message: 'Có lỗi xảy ra khi chuyển đổi tổ chức' }
    }
  }
}
