import { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'

export default class CurrentOrganizationMiddleware {
  private isDevMode = env.get('NODE_ENV') === 'development'
  private log(...args: any[]) {
    if (this.isDevMode) {
      console.log('[ORGANIZATION MIDDLEWARE]', ...args)
    }
  }

  async handle({ session, auth }: HttpContext, next: () => Promise<void>) {
    const startTime = performance.now()
    try {
      // Chỉ xử lý khi người dùng đã đăng nhập
      if (await auth.check()) {
        const user = auth.user!
        // Lấy current_organization_id từ session và database
        const sessionOrgId = session.get('current_organization_id')
        const dbOrgId = user.current_organization_id
        this.log('Current organization check:', {
          userId: user.id,
          sessionOrgId,
          dbOrgId,
          sessionOrgIdType: typeof sessionOrgId,
          dbOrgIdType: typeof dbOrgId,
        })
        
        // Nếu cả session và database đều không có organization_id, điều này là hợp lệ
        if (!sessionOrgId && !dbOrgId) {
          this.log('Người dùng không có tổ chức nào, điều này là hợp lệ')
          await next()
          const endTime = performance.now()
          this.log(`Thời gian xử lý: ${Math.round(endTime - startTime)}ms`)
          return
        }
        
        // Nếu session có organization_id nhưng database không có hoặc khác
        if (sessionOrgId && (!dbOrgId || String(sessionOrgId) !== String(dbOrgId))) {
          this.log('Phát hiện khác biệt giữa session và database, session có ID: ' + sessionOrgId)
          // Kiểm tra xem người dùng có quyền truy cập organization_id trong session không
          const hasAccess = await db
            .from('organization_users')
            .where('organization_id', sessionOrgId)
            .where('user_id', user.id)
            .first()
          if (hasAccess) {
            // Cập nhật database nếu người dùng có quyền truy cập
            try {
              // Chuyển đổi sang kiểu số trước khi lưu vào database
              const orgIdNumeric = Number(sessionOrgId)
              await user.merge({ current_organization_id: orgIdNumeric }).save()
              await user.refresh() // Làm mới thông tin user sau khi cập nhật
              this.log('Đã đồng bộ organization_id từ session vào database:', {
                oldValue: dbOrgId,
                newValue: user.current_organization_id,
                sessionValue: sessionOrgId,
              })
            } catch (error) {
              this.log('Lỗi khi cập nhật current_organization_id vào database:', error)
            }
          } else {
            this.log(
              `Người dùng không có quyền truy cập tổ chức ${sessionOrgId} trong session, đang xóa khỏi session`
            )
            // Xóa organization_id không hợp lệ khỏi session
            session.forget('current_organization_id')
            await session.commit()
          }
        }
        // Nếu database có organization_id nhưng session không có hoặc khác
        else if (dbOrgId && (!sessionOrgId || String(sessionOrgId) !== String(dbOrgId))) {
          this.log('Phát hiện khác biệt giữa session và database, database có ID: ' + dbOrgId)
          // Kiểm tra xem tổ chức có trong danh sách tổ chức của người dùng không
          const hasAccess = await db
            .from('organization_users')
            .where('organization_id', dbOrgId)
            .where('user_id', user.id)
            .first()
          if (hasAccess) {
            // Xóa giá trị cũ nếu có
            session.forget('current_organization_id')
            await session.commit()
            // Cập nhật session với organization_id từ database (lưu dưới dạng kiểu số)
            session.put('current_organization_id', Number(dbOrgId))
            await session.commit()
            // Xác minh lại giá trị đã lưu
            const verifiedSessionValue = session.get('current_organization_id')
            this.log('Đã đồng bộ organization_id từ database vào session:', {
              oldValue: sessionOrgId,
              newValue: verifiedSessionValue,
              dbValue: dbOrgId,
              typeBefore: typeof sessionOrgId,
              typeAfter: typeof verifiedSessionValue,
            })
          } else {
            this.log(
              `Người dùng không có quyền truy cập tổ chức ${dbOrgId} trong database, đang xóa khỏi database và session`
            )
            // Xóa organization_id không hợp lệ khỏi database
            try {
              await user.merge({ current_organization_id: null }).save()
              await user.refresh() // Làm mới thông tin user sau khi cập nhật
              this.log('Đã xóa organization_id không hợp lệ khỏi database:', {
                oldValue: dbOrgId,
                newValue: user.current_organization_id,
              })
              // Đảm bảo session cũng không có organization_id
              session.forget('current_organization_id')
              await session.commit()
            } catch (error) {
              this.log('Lỗi khi xóa current_organization_id từ database:', error)
            }
          }
        } else {
          this.log('Session và database đã đồng bộ, organization_id:', {
            value: sessionOrgId || 'không có',
            type: typeof sessionOrgId,
          })
        }
      }
    } catch (error) {
      this.log('Lỗi trong middleware:', error)
    }
    await next()
    const endTime = performance.now()
    this.log(`Thời gian xử lý: ${Math.round(endTime - startTime)}ms`)
  }
}
