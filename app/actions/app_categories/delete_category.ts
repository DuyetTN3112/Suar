import type { HttpContext } from '@adonisjs/core/http'
import AppCategory from '#models/app_category'
import App from '#models/app'
import AuditLog from '#models/audit_log'

export default class DeleteCategory {
  constructor(private ctx: HttpContext) {}

  async execute() {
    const { request, response, session, auth, params } = this.ctx
    const categoryId = params.id

    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để thực hiện hành động này')
      return response.redirect().back()
    }

    // Kiểm tra xem người dùng có quyền xóa danh mục không
    if (auth.user.role_id !== 1) {
      session.flash('error', 'Bạn không có quyền thực hiện hành động này')
      return response.redirect().toRoute('app-categories.index')
    }

    try {
      // Kiểm tra xem danh mục có ứng dụng không
      const appsCount = await App.query()
        .where('category_id', categoryId)
        .whereNull('deleted_at')
        .count('id as count')
        .first()

      if (appsCount && Number(appsCount.$extras.count) > 0) {
        session.flash('error', 'Không thể xóa danh mục đang chứa ứng dụng')
        return response.redirect().back()
      }

      // Tìm danh mục cần xóa
      const category = await AppCategory.findOrFail(categoryId)
      const oldData = JSON.stringify(category.toJSON())

      // Xóa danh mục
      await category.delete()

      // Ghi log hành động
      await AuditLog.create({
        user_id: auth.user.id,
        action: 'delete',
        entity_type: 'app_category',
        entity_id: categoryId.toString(),
        old_values: JSON.parse(oldData),
        ip_address: request.ip(),
        user_agent: request.header('user-agent'),
      })

      session.flash('success', 'Danh mục đã được xóa thành công')
      return response.redirect().toRoute('app-categories.index')
    } catch (error) {
      session.flash('error', 'Không thể xóa danh mục. Vui lòng thử lại sau')
      return response.redirect().back()
    }
  }
}
