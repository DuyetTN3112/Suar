import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'

export default class CurrentOrganizationMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'

  async handle({ session, auth }: HttpContext, next: () => Promise<void>) {
    try {
      // Chỉ xử lý khi người dùng đã đăng nhập
      if (await auth.check()) {
        const user = auth.user
        if (!user) {
          await next()
          return
        }
        // Lấy current_organization_id từ session và database
        const sessionOrgId = session.get('current_organization_id') as number | string | undefined
        const dbOrgId = user.current_organization_id

        // Nếu cả session và database đều không có organization_id, điều này là hợp lệ
        if (!sessionOrgId && !dbOrgId) {
          await next()
          return
        }
        // Nếu session có organization_id nhưng database không có hoặc khác
        if (sessionOrgId && (!dbOrgId || String(sessionOrgId) !== String(dbOrgId))) {
          // Kiểm tra xem người dùng có quyền truy cập organization_id trong session không
          const hasAccess = (await db
            .from('organization_users')
            .where('organization_id', String(sessionOrgId))
            .where('user_id', user.id)
            .first()) as { organization_id: number; user_id: number } | null
          if (hasAccess) {
            // Cập nhật database nếu người dùng có quyền truy cập
            try {
              // Chuyển đổi sang kiểu số trước khi lưu vào database
              const orgIdNumeric = Number(sessionOrgId)
              await user.merge({ current_organization_id: orgIdNumeric }).save()
              await user.refresh() // Làm mới thông tin user sau khi cập nhật
            } catch (_error) {
              // Only log actual errors in production
              if (!this.isDevMode) {
                console.error(
                  `Người dùng không có quyền truy cập tổ chức ${String(sessionOrgId)} trong session, đang xóa khỏi session`
                )
              }
            }
          } else {
            // Only log actual errors in production
            if (!this.isDevMode) {
              console.error(
                `Người dùng không có quyền truy cập tổ chức ${String(sessionOrgId)} trong session, đang xóa khỏi session`
              )
            }
            // Xóa organization_id không hợp lệ khỏi session
            session.forget('current_organization_id')
            await session.commit()
          }
        }
        // Nếu database có organization_id nhưng session không có hoặc khác
        else if (dbOrgId && (!sessionOrgId || String(sessionOrgId) !== String(dbOrgId))) {
          // Kiểm tra xem tổ chức có trong danh sách tổ chức của người dùng không
          const hasAccess = (await db
            .from('organization_users')
            .where('organization_id', dbOrgId)
            .where('user_id', user.id)
            .first()) as { organization_id: number; user_id: number } | null
          if (hasAccess) {
            // Xóa giá trị cũ nếu có
            session.forget('current_organization_id')
            await session.commit()
            // Cập nhật session với organization_id từ database (lưu dưới dạng kiểu số)
            session.put('current_organization_id', dbOrgId)
            await session.commit()
          } else {
            // Only log actual errors in production
            if (!this.isDevMode) {
              console.error(
                `Người dùng không có quyền truy cập tổ chức ${String(dbOrgId)} trong database, đang xóa khỏi database và session`
              )
            }
            // Xóa organization_id không hợp lệ khỏi database
            try {
              await user.merge({ current_organization_id: null }).save()
              await user.refresh() // Làm mới thông tin user sau khi cập nhật
              // Đảm bảo session cũng không có organization_id
              session.forget('current_organization_id')
              await session.commit()
            } catch (_error) {
              // Only log actual errors in production
              if (!this.isDevMode) {
                console.error('Lỗi khi xóa current_organization_id từ database:', _error)
              }
            }
          }
        }
      }
    } catch (_error) {
      // Only log actual errors in production
      if (!this.isDevMode) {
        console.error('Lỗi trong middleware:', _error)
      }
    }
    await next()
  }
}
