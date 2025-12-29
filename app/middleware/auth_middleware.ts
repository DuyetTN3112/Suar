import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
// import env from '#start/env'
import loggerService from '#services/logger_service'

/**
 * Định nghĩa kiểu dữ liệu cho OrganizationUser
 */
// interface OrganizationUser {
//   id: number
//   organization_id: number
//   user_id: number
//   role?: {
//     id: number
//     name: string
//   }
// }

/**
 * Middleware kiểm tra người dùng đã đăng nhập hay chưa
 * Sử dụng middleware này cho các route cần xác thực
 */
export default class AuthMiddleware {
  public redirectTo = '/login'
  // private isDevMode = env.get('NODE_ENV') === 'development'

  public async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ): Promise<void> {
    const startTime = performance.now()

    try {
      loggerService.info('Xác thực người dùng', { url: ctx.request.url() })

      // Kiểm tra xác thực
      await ctx.auth.authenticateUsing(options.guards || ['web'], {
        loginRoute: this.redirectTo,
      })

      // Đảm bảo thông tin người dùng được truyền đến inertia
      if (ctx.auth.user) {
        // Thêm role và thông tin khác vào user
        await ctx.auth.user.load('system_role')
        await ctx.auth.user.load('organizations')
        // Kiểm tra vai trò và thiết lập isAdmin
        const systemRoleName = ctx.auth.user.system_role?.name?.toLowerCase()
        const isAdmin =
          systemRoleName === 'superadmin' ||
          systemRoleName === 'system_admin' ||
          [1, 2].includes(ctx.auth.user.system_role_id ?? 0)

        // Lấy current_organization_id từ session hoặc từ model user
        const currentOrganizationId = (ctx.session.get('current_organization_id') ??
          ctx.auth.user.current_organization_id) as number | undefined

        // Nếu có current_organization_id, load thêm thông tin về vai trò trong tổ chức hiện tại
        let organizationUsers: unknown[] = []
        if (currentOrganizationId !== undefined) {
          await ctx.auth.user.load('organization_users', (query) => {
            void query.where('organization_id', currentOrganizationId)
          })
          organizationUsers = ctx.auth.user.organization_users ?? []
        }

        // Chia sẻ thông tin người dùng với inertia
        ctx.inertia?.share({
          auth: {
            user: {
              ...ctx.auth.user.serialize(),
              username: ctx.auth.user.username,
              email: ctx.auth.user.email,
              system_role: ctx.auth.user.system_role?.serialize(),
              isAdmin,
              current_organization_id: currentOrganizationId,
              organization_users: organizationUsers,
              organizations: ctx.auth.user.organizations?.map((org) => ({
                id: org.id,
                name: org.name,
                logo: org.logo,
                plan: org.plan,
              })),
            },
          },
        })
      }

      // Log thông tin xác thực thành công (thông tin tối giản)
      loggerService.info('Xác thực thành công', {
        userId: ctx.auth.user?.id,
        duration: `${Math.round(performance.now() - startTime)}ms`,
      })

      await next()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      loggerService.error('Lỗi xác thực:', errorMessage)

      // Lưu URL hiện tại để chuyển hướng sau khi đăng nhập
      ctx.session.put('intended_url', ctx.request.url())

      // Lưu log lỗi vào session - chỉ lưu thông tin cần thiết
      ctx.session.flash('authError', {
        timestamp: new Date().toISOString(),
        attemptedUrl: ctx.request.url(),
      })

      if (ctx.request.header('x-inertia')) {
        ctx.inertia.location(this.redirectTo)
        return
      }

      ctx.response.redirect().toPath(this.redirectTo)
    }
  }
}
