import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

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

  // Thêm debug log
  private isDevMode = env.get('NODE_ENV') === 'development'
  private log(...args: any[]) {
    if (this.isDevMode) {
      console.log('[SwitchOrganization]', ...args)
    }
  }

  async handle({ organizationId }: { organizationId: number }) {
    try {
      // Kiểm tra nếu organizationId rỗng
      if (!organizationId) {
        this.log('Error: organizationId is null or empty')
        return { success: false, message: 'ID tổ chức không được để trống' }
      }
      const user = this.ctx.auth.user!
      this.log(`Attempting to switch user ${user.id} to organization ${organizationId}`)
      this.log('Session hiện tại:', {
        currentOrgId: this.ctx.session.get('current_organization_id'),
        userId: this.ctx.auth.user?.id,
        sessionId: this.ctx.session.sessionId,
      })
      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(organizationId)
      if (!organization) {
        this.log(`Organization ${organizationId} not found`)
        return { success: false, message: 'Không tìm thấy tổ chức' }
      }
      // Kiểm tra người dùng có quyền truy cập tổ chức không
      const hasAccess = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .first()
      this.log('Permission check result:', hasAccess)
      if (!hasAccess) {
        this.log(`User ${user.id} has no access to organization ${organizationId}`)
        return { success: false, message: 'Bạn không có quyền truy cập tổ chức này' }
      }
      // Không cần chuyển đổi ID sang kiểu số nữa vì đã là số
      const orgIdNumeric = organizationId
      // Cập nhật session - lưu dưới dạng số
      this.ctx.session.put('current_organization_id', orgIdNumeric)
      this.log('Session đã được cập nhật, đang chuẩn bị commit')
      // Đảm bảo session được lưu
      await this.ctx.session.commit()
      this.log('Session sau commit:', {
        current_organization_id: this.ctx.session.get('current_organization_id'),
        sessionId: this.ctx.session.sessionId,
      })
      // Cập nhật current_organization_id trong database - lưu dưới dạng số
      try {
        await user.merge({ current_organization_id: orgIdNumeric }).save()
        this.log(
          `Database updated: User ${user.id} current_organization_id set to ${organizationId}`
        )
      } catch (dbError) {
        this.log('Lỗi khi cập nhật database:', dbError)
        // Lỗi database không gây lỗi toàn bộ thao tác, vì session đã được cập nhật
      }

      // Tải lại thông tin của user từ database để đảm bảo dữ liệu mới nhất
      await user.refresh()

      // Kiểm tra lại sau khi cập nhật
      this.log('Verification after update:', {
        session_org_id: this.ctx.session.get('current_organization_id'),
        user_db_org_id: user.current_organization_id,
        org_id_type_session: typeof this.ctx.session.get('current_organization_id'),
        org_id_type_db: typeof user.current_organization_id,
      })

      this.log(
        `Switch organization success: User ${user.id} switched to organization ${organization.id}`
      )
      return {
        success: true,
        message: `Đã chuyển sang tổ chức "${organization.name}"`,
        organization,
      }
    } catch (error) {
      this.log('Switch organization error:', error)
      return { success: false, message: 'Có lỗi xảy ra khi chuyển đổi tổ chức' }
    }
  }
}
