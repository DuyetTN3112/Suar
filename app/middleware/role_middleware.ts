import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'

/**
 * Middleware kiểm tra quyền của người dùng
 * Sử dụng middleware này cho các route cần phân quyền
 */
@inject()
export default class RoleMiddleware {
  /**
   * Xử lý request
   * @param roles Mảng các role ID được phép truy cập
   */
  async handle(ctx: HttpContext, next: NextFn, roles: string[] = []): Promise<void> {
    /**
     * Kiểm tra trạng thái xác thực
     */
    if (!ctx.auth.isAuthenticated) {
      /**
       * Đối với AJAX request, trả về lỗi 401
       */
      if (ctx.request.ajax()) {
        ctx.response.status(401).json({
          error: 'Unauthorized',
          message: 'Bạn cần đăng nhập để thực hiện hành động này',
        })
        return
      }

      /**
       * Đối với Inertia request, chuyển hướng về trang đăng nhập
       */
      if (ctx.request.header('X-Inertia')) {
        return ctx.inertia.location('/login')
      }

      /**
       * Chuyển hướng về trang đăng nhập
       */
      ctx.response.redirect().toRoute('login')
      return
    }

    /**
     * Kiểm tra quyền của người dùng
     */
    if (roles.length > 0) {
      const userRoleId = ctx.auth.user?.system_role_id
      if (!userRoleId || !roles.includes(userRoleId.toString())) {
        /**
         * Đối với AJAX request, trả về lỗi 403
         */
        if (ctx.request.ajax()) {
          ctx.response.status(403).json({
            error: 'Forbidden',
            message: 'Bạn không có quyền thực hiện hành động này',
          })
          return
        }

        /**
         * Đối với Inertia request, hiển thị trang lỗi 403
         */
        if (ctx.request.header('X-Inertia')) {
          ctx.response.status(403).json({
            component: 'errors/Forbidden',
            props: {
              status: 403,
              message: 'Bạn không có quyền thực hiện hành động này',
            },
          })
          return
        }

        /**
         * Chuyển hướng về trang tasks hoặc hiển thị thông báo lỗi
         */
        ctx.session.flash('error', 'Bạn không có quyền thực hiện hành động này')
        ctx.response.redirect().toRoute('tasks.index')
        return
      }
    }

    /**
     * Tiếp tục xử lý request
     */
    await next()
  }
}
