import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class RequireOrganizationMiddleware {
  /**
   * Middleware kiểm tra người dùng đã thuộc tổ chức nào chưa
   * Nếu chưa, sẽ đặt một flag trong session để hiển thị modal popup
   */
  async handle({ auth, response, session, request }: HttpContext, next: () => Promise<void>) {
    console.log('[RequireOrgMiddleware] Processing request for path:', request.url(true))
    // Bỏ qua kiểm tra nếu người dùng chưa đăng nhập
    if (!auth.isAuthenticated) {
      console.log('[RequireOrgMiddleware] User not authenticated, skipping check')
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
      console.log('[RequireOrgMiddleware] Path is exempt (organizations page)')
      // Xóa flag hiển thị modal nếu người dùng đang truy cập trang tổ chức
      if (session.has('show_organization_required_modal')) {
        console.log('[RequireOrgMiddleware] Removing show_organization_required_modal flag')
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
          console.log(`[RequireOrgMiddleware] Path is exempt (matches wildcard ${path})`)
          return next()
        }
      } else if (currentPath === path) {
        console.log(`[RequireOrgMiddleware] Path is exempt (exact match ${path})`)
        return next()
      }
    }
    console.log('[RequireOrgMiddleware] Path is not exempt, checking organization')

    const user = auth.user!
    console.log('[RequireOrgMiddleware] User:', user.id, user.email)
    console.log('[RequireOrgMiddleware] Current organization ID:', user.current_organization_id)
    // Kiểm tra xem người dùng có current_organization_id hay không
    if (user.current_organization_id) {
      console.log('[RequireOrgMiddleware] User has current_organization_id, verifying it')
      // Xác minh rằng current_organization_id là hợp lệ
      const validOrg = await db
        .from('organization_users')
        .where('user_id', user.id)
        .where('organization_id', user.current_organization_id)
        .first()
      console.log('[RequireOrgMiddleware] Valid organization check result:', !!validOrg)

      if (validOrg) {
        // Người dùng đã có tổ chức hợp lệ và đang được chọn, xóa flag nếu có
        if (session.has('show_organization_required_modal')) {
          console.log('[RequireOrgMiddleware] Removing show_organization_required_modal flag')
          session.forget('show_organization_required_modal')
          await session.commit()
        }
        console.log('[RequireOrgMiddleware] User has valid organization, proceeding')
        return next()
      }
    }
    // Đầu tiên kiểm tra xem người dùng có tổ chức nào không
    console.log('[RequireOrgMiddleware] Checking if user has any organizations')
    const anyOrganization = await db.from('organization_users').where('user_id', user.id).first()
    console.log('[RequireOrgMiddleware] User has organizations:', !!anyOrganization)

    // Nếu không có tổ chức nào, đặt flag để hiển thị modal
    if (!anyOrganization) {
      console.log('[RequireOrgMiddleware] User has no organizations, setting modal flag')
      // Lưu URL hiện tại để sau khi tạo/tham gia tổ chức có thể quay lại
      session.put('intended_url', request.url(true))
      // Đánh dấu là cần hiển thị modal tổ chức thay vì redirect
      session.put('show_organization_required_modal', true)
      await session.commit()
      console.log('[RequireOrgMiddleware] Session flags set:', {
        intended_url: request.url(true),
        show_organization_required_modal: true,
      })
      // Nếu là API request, vẫn trả về lỗi JSON
      if (request.accepts(['html', 'json']) === 'json') {
        console.log('[RequireOrgMiddleware] API request, returning JSON error')
        return response.status(403).json({
          error: 'Bạn cần tham gia một tổ chức trước khi thực hiện thao tác này',
          redirectTo: '/organizations',
        })
      }
      console.log('[RequireOrgMiddleware] HTML request, continuing to frontend for modal handling')
      // Đối với yêu cầu HTML, cho phép tiếp tục để xử lý modal trong frontend
      return next()
    } else {
      console.log('[RequireOrgMiddleware] User has organizations but no current_organization_id')
      // Người dùng đã có tổ chức nhưng chưa đặt current_organization_id
      // Đặt tổ chức đầu tiên làm tổ chức hiện tại
      const firstOrgId = anyOrganization.organization_id
      console.log('[RequireOrgMiddleware] Setting first organization as current:', firstOrgId)
      // Cập nhật current_organization_id trong database và session
      await user.merge({ current_organization_id: firstOrgId }).save()
      session.put('current_organization_id', firstOrgId)
      // Xóa flag hiển thị modal nếu có
      if (session.has('show_organization_required_modal')) {
        console.log('[RequireOrgMiddleware] Removing show_organization_required_modal flag')
        session.forget('show_organization_required_modal')
      }
      await session.commit()
      console.log('[RequireOrgMiddleware] User organization set, continuing')
    }
    // Tiếp tục xử lý
    console.log(
      '[RequireOrgMiddleware] Final check passed, continuing to next middleware/controller'
    )
    return next()
  }
}
