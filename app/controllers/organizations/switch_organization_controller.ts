import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'

@inject()
export default class SwitchOrganizationController {
  private isDevMode = env.get('NODE_ENV') === 'development'
  private log(...args: any[]) {
    if (this.isDevMode) {
      console.log('[SwitchOrganizationController]', ...args)
    }
  }

  @inject()
  async handle({ request, response, session, auth, inertia }: HttpContext) {
    // Lấy organization_id và currentPath từ request
    const { organization_id: organizationId, current_path: currentPath } = request.only([
      'organization_id',
      'current_path',
    ])
    // Chỉ log thông tin cơ bản trong môi trường phát triển
    this.log('Switching to organization ID:', organizationId)
    this.log('Current path:', currentPath)
    try {
      // Kiểm tra nếu organizationId không tồn tại hoặc là null
      if (!organizationId) {
        this.log('Organization ID is missing or null')
        if (request.accepts(['html', 'json']) === 'json') {
          return response.status(400).json({ success: false, message: 'Thiếu ID tổ chức' })
        }
        return inertia.render('errors/400', { message: 'Thiếu ID tổ chức' })
      }
      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(organizationId)
      if (!organization) {
        this.log('Organization not found:', organizationId)
        if (request.accepts(['html', 'json']) === 'json') {
          return response.status(404).json({ success: false, message: 'Không tìm thấy tổ chức' })
        }
        return inertia.render('errors/404', { message: 'Không tìm thấy tổ chức' })
      }
      // Kiểm tra người dùng có quyền truy cập tổ chức không
      const user = auth.user!
      const hasAccess = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .first()

      if (!hasAccess) {
        this.log('User has no access to organization:', organizationId)
        if (request.accepts(['html', 'json']) === 'json') {
          return response.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập tổ chức này',
          })
        }
        return inertia.render('errors/403', { message: 'Bạn không có quyền truy cập tổ chức này' })
      }
      // Chuyển đổi sang kiểu số
      const orgIdNumeric = Number(organizationId)
      // Cập nhật session
      session.forget('current_organization_id')
      await session.commit()
      session.put('current_organization_id', orgIdNumeric)
      await session.commit()
      // Cập nhật trong database
      try {
        await user.merge({ current_organization_id: orgIdNumeric }).save()
        await user.refresh()
      } catch (error) {
        this.log('Error updating database:', error)
        // Lỗi database không gây lỗi toàn bộ thao tác
      }
      // Xử lý phản hồi dựa trên loại request
      const redirectPath = currentPath || '/tasks'
      const successMessage = `Đã chuyển sang tổ chức "${organization.name}"`
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: successMessage,
          redirect: redirectPath,
        })
      }
      // Sử dụng Inertia để chuyển hướng trong SPA
      session.flash('success', successMessage)
      return inertia.location(redirectPath)
    } catch (error) {
      this.log('Error updating session:', error)
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(500).json({
          success: false,
          message: 'Có lỗi xảy ra khi chuyển đổi tổ chức',
        })
      }
      return inertia.render('errors/500', { message: 'Có lỗi xảy ra khi chuyển đổi tổ chức' })
    }
  }
}
