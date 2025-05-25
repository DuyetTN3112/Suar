import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
// import Logger from '@adonisjs/core/services/logger'

export default class RequireOrganizationMiddleware {
  /**
   * Middleware kiểm tra người dùng đã thuộc tổ chức nào chưa
   * Nếu chưa, sẽ đặt một flag trong session để hiển thị modal popup
   */
  async handle({ auth, response, session, request }: HttpContext, next: () => Promise<void>) {
    // Bỏ qua kiểm tra nếu người dùng chưa đăng nhập
    if (!auth.isAuthenticated) {
      return next()
    }

    // Kiểm tra xem đường dẫn hiện tại có thuộc danh sách được miễn không
    const exemptPaths = [
      '/organizations',
      '/organizations/*',
      '/auth/*',
      '/logout',
      '/errors/*',
      '/api/organizations',
      '/api/organizations/*',
    ]
    const currentPath = request.url(true)
    // Kiểm tra nếu đang truy cập trang organizations, cho phép truy cập trực tiếp
    // Đồng thời xóa flag hiển thị modal nếu có
    if (currentPath === '/organizations' || currentPath.startsWith('/organizations/')) {
      // Xóa flag hiển thị modal nếu người dùng đang truy cập trang tổ chức
      if (session.has('show_organization_required_modal')) {
        session.forget('show_organization_required_modal')
        await session.commit()
      }
      return next()
    }

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
    // Kiểm tra xem người dùng có current_organization_id hay không
    if (user.current_organization_id) {
      // Xác minh rằng current_organization_id là hợp lệ
      const validOrg = await db
        .from('organization_users')
        .where('user_id', user.id)
        .where('organization_id', user.current_organization_id)
        .where('status', 'approved') // Chỉ chấp nhận trạng thái approved
        .first()

      if (validOrg) {
        // Người dùng đã có tổ chức hợp lệ và đang được chọn, xóa flag nếu có
        if (session.has('show_organization_required_modal')) {
          session.forget('show_organization_required_modal')
          await session.commit()
        }
        return next()
      }
    }

    // Đầu tiên kiểm tra xem người dùng có tổ chức nào không
    const anyOrganization = await db
      .from('organization_users')
      .where('user_id', user.id)
      .where('status', 'approved') // Chỉ chấp nhận trạng thái approved
      .first()

    // Nếu không có tổ chức nào, đặt flag để hiển thị modal
    if (!anyOrganization) {
      // Lưu URL hiện tại để sau khi tạo/tham gia tổ chức có thể quay lại
      session.put('intended_url', request.url(true))
      // Đánh dấu là cần hiển thị modal tổ chức thay vì redirect
      session.put('show_organization_required_modal', true)
      await session.commit()

      // Nếu là API request, vẫn trả về lỗi JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(403).json({
          error: 'Bạn cần tham gia một tổ chức trước khi thực hiện thao tác này',
          redirectTo: '/organizations',
        })
      }
      // Đối với yêu cầu HTML, cho phép tiếp tục để xử lý modal trong frontend
      return next()
    } else {
      // Người dùng đã có tổ chức nhưng chưa đặt current_organization_id
      // Đặt tổ chức đầu tiên làm tổ chức hiện tại
      const firstOrgId = anyOrganization.organization_id
      // Cập nhật current_organization_id trong database và session
      await user.merge({ current_organization_id: firstOrgId }).save()
      session.put('current_organization_id', firstOrgId)
      // Xóa flag hiển thị modal nếu có
      if (session.has('show_organization_required_modal')) {
        session.forget('show_organization_required_modal')
      }
      await session.commit()
    }
    // Tiếp tục xử lý
    return next()
  }
}
