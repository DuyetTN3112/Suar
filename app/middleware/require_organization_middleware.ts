import type { HttpContext } from '@adonisjs/core/http'
import { HttpStatus, createApiError, ErrorCode, ErrorMessages } from '#constants/error_constants'

/**
 * RequireOrganization Middleware — Thin Guard
 *
 * CHỈ KIỂM TRA: user đã có current_organization_id chưa.
 * Organization resolution logic đã chạy trước đó bởi
 * OrganizationResolverMiddleware (global router middleware).
 *
 * Nếu user không có org → hiện modal hoặc trả 403 JSON.
 *
 * Dùng cho route groups cần ENFORCE có organization:
 *   .use([middleware.auth(), middleware.requireOrg()])
 *
 * UUID-READY: Dùng truthy check thay vì so sánh number
 *
 * TRƯỚC (117 dòng):
 *   - 2 DB queries MỖI request (validate org + find first org)
 *   - Duplicate logic với OrganizationResolverMiddleware
 *   - Hardcoded `{ id: number }` types
 *
 * SAU (45 dòng):
 *   - 0 DB queries (đã resolve bởi OrganizationResolver)
 *   - Chỉ check kết quả session/model
 *   - UUID-ready (truthy check)
 */
export default class RequireOrganizationMiddleware {
  async handle({ auth, response, session, request }: HttpContext, next: () => Promise<void>) {
    // Skip nếu chưa đăng nhập (auth middleware sẽ xử lý)
    if (!auth.isAuthenticated || !auth.user) {
      return next()
    }

    // OrganizationResolver đã chạy trước — chỉ cần check kết quả
    const currentOrgId = session.get('current_organization_id') ?? auth.user.current_organization_id

    if (currentOrgId) {
      // Có org → tiếp tục
      return next()
    }

    // Không có org → block request
    if (request.accepts(['html', 'json']) === 'json') {
      response.status(HttpStatus.FORBIDDEN).json({
        ...createApiError(ErrorCode.FORBIDDEN, ErrorMessages.REQUIRE_ORGANIZATION),
        redirectTo: '/organizations',
      })
      return
    }

    // HTML: set flag cho frontend modal, vẫn next() để Inertia render
    session.put('intended_url', request.url(true))
    session.put('show_organization_required_modal', true)
    return next()
  }
}
