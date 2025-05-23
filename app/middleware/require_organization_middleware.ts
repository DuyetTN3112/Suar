import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class RequireOrganizationMiddleware {
  /**
   * Middleware kiểm tra người dùng đã thuộc tổ chức nào chưa
   * Nếu chưa, sẽ điều hướng đến trang thông báo yêu cầu tham gia tổ chức
   */
  async handle({ auth, response, session, request }: HttpContext, next: () => Promise<void>) {
    // Bỏ qua kiểm tra nếu người dùng chưa đăng nhập
    if (!auth.isAuthenticated) {
      return next()
    }

    // Kiểm tra xem đường dẫn hiện tại có thuộc danh sách được miễn không
    const exemptPaths = ['/organizations', '/organizations/*', '/auth/*', '/logout', '/errors/*']
    const currentPath = request.url(true)

    // Cho phép truy cập các trang được miễn
    for (const path of exemptPaths) {
      if (path.endsWith('/*')) {
        const basePath = path.slice(0, -2)
        if (currentPath.startsWith(basePath)) {
          return next()
        }
      } else if (currentPath === path) {
        return next()
      }
    }

    const user = auth.user!
    // Đầu tiên kiểm tra xem người dùng có tổ chức nào không
    const anyOrganization = await db.from('organization_users').where('user_id', user.id).first()

    // Nếu không có tổ chức nào, điều hướng đến trang thông báo
    if (!anyOrganization) {
      // Lưu URL hiện tại để sau khi tạo/tham gia tổ chức có thể quay lại
      session.put('intended_url', request.url(true))
      await session.commit()
      if (request.accepts(['html'])) {
        return response.redirect('/errors/require-organization')
      }
      return response.status(403).json({
        error: 'Bạn cần tham gia một tổ chức trước khi thực hiện thao tác này',
        redirectTo: '/errors/require-organization',
      })
    }
    // Kiểm tra tổ chức hiện tại có hợp lệ không
    const currentOrganizationId =
      session.get('current_organization_id') || user.current_organization_id
    if (currentOrganizationId) {
      const hasCurrentOrganization = await db
        .from('organization_users')
        .where('user_id', user.id)
        .where('organization_id', currentOrganizationId)
        .first()
      if (!hasCurrentOrganization) {
        // Tổ chức hiện tại không hợp lệ, cập nhật thành tổ chức đầu tiên của user
        const firstOrg = await db.from('organization_users').where('user_id', user.id).first()
        if (firstOrg) {
          session.put('current_organization_id', firstOrg.organization_id)
          await user.merge({ current_organization_id: firstOrg.organization_id }).save()
          await session.commit()
        }
      }
    } else if (anyOrganization) {
      // Có tổ chức nhưng chưa đặt tổ chức hiện tại
      session.put('current_organization_id', anyOrganization.organization_id)
      await user.merge({ current_organization_id: anyOrganization.organization_id }).save()
      await session.commit()
    }

    // Tiếp tục xử lý
    return next()
  }
}
