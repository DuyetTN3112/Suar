import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'

/**
 * Controller for switching between organizations
 *
 * CQRS Pattern: Uses SwitchOrganizationCommand
 */
export default class SwitchOrganizationController {
  /**
   * Switch to a different organization
   *
   * Sử dụng SwitchOrganizationCommand
   */
  async handle(ctx: HttpContext) {
    const { request, response, session, inertia } = ctx

    // Manual instantiation
    const switchOrganization = new SwitchOrganizationCommand(ctx)
    try {
      // Lấy organization_id và currentPath từ request
      const requestData = request.only(['organization_id', 'current_path']) as {
        organization_id?: string | number
        current_path?: string
      }
      const organizationId = requestData.organization_id
      const currentPath = requestData.current_path

      // Kiểm tra nếu organizationId không tồn tại hoặc là null
      if (!organizationId) {
        const errorMessage = 'Thiếu ID tổ chức'

        if (request.accepts(['html', 'json']) === 'json') {
          response.status(400).json({ success: false, message: errorMessage })
          return
        }

        return await inertia.render('errors/400', { message: errorMessage })
      }

      const orgId = Number(organizationId)

      // Get organization info before switching
      const organization = (await db
        .from('organizations')
        .where('id', orgId)
        .whereNull('deleted_at')
        .first()) as { id: number; name: string } | null

      if (!organization) {
        const errorMessage = 'Không tìm thấy tổ chức'

        if (request.accepts(['html', 'json']) === 'json') {
          response.status(404).json({ success: false, message: errorMessage })
          return
        }

        return await inertia.render('errors/404', { message: errorMessage })
      }

      // Sử dụng SwitchOrganizationCommand (validates membership inside)
      await switchOrganization.execute(orgId)

      // Cập nhật session
      session.forget('current_organization_id')
      await session.commit()
      session.put('current_organization_id', orgId)
      await session.commit()

      // Xử lý phản hồi dựa trên loại request
      const redirectPath = currentPath ?? '/tasks'
      const successMessage = `Đã chuyển sang tổ chức "${organization.name}"`

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: successMessage,
          redirect: redirectPath,
          organization,
        })
        return
      }

      // Sử dụng Inertia để chuyển hướng trong SPA
      session.flash('success', successMessage)
      await inertia.location(redirectPath)
      return
    } catch (error: unknown) {
      console.error('[SwitchOrganizationController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi chuyển đổi tổ chức'

      if (request.accepts(['html', 'json']) === 'json') {
        response.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      return await inertia.render('errors/500', { message: errorMessage })
    }
  }
}
