import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AppCategory from '#models/app_category'
import AuditLog from '#models/audit_log'
import { updateAppCategoryValidator } from '#validators/app'

type CategoryData = {
  id: number
  name: string
  description: string | null
  slug: string
  icon: string | null
  order: number
}

@inject()
export default class UpdateCategory {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: CategoryData }) {
    // Tìm danh mục cần cập nhật
    const category = await AppCategory.findOrFail(data.id)
    // Kiểm tra nếu slug đã thay đổi, xem có trùng lặp không
    if (data.slug !== category.slug) {
      const existingCategory = await AppCategory.query()
        .where('slug', data.slug)
        .whereNot('id', data.id)
        .first()
      if (existingCategory) {
        throw new Error('Slug đã tồn tại, vui lòng chọn slug khác')
      }
    }
    // Cập nhật danh mục
    category.merge(data)
    await category.save()
    return category
  }

  async execute() {
    const { request, response, session, auth, params } = this.ctx
    const categoryId = params.id

    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để thực hiện hành động này')
      return response.redirect().back()
    }

    // Kiểm tra xem người dùng có quyền cập nhật danh mục không
    if (auth.user.role_id !== 1) {
      session.flash('error', 'Bạn không có quyền thực hiện hành động này')
      return response.redirect().toRoute('app-categories.index')
    }

    try {
      // Tìm danh mục cần cập nhật
      const category = await AppCategory.findOrFail(categoryId)
      const oldData = JSON.stringify(category.toJSON())
      // Xác thực dữ liệu đầu vào
      const data = await updateAppCategoryValidator.validate(request.all())
      // Kiểm tra xem tên mới đã tồn tại chưa (nếu thay đổi tên)
      if (data.name && data.name !== category.name) {
        const existingCategory = await AppCategory.query()
          .where('name', data.name)
          .whereNot('id', categoryId)
          .first()
        if (existingCategory) {
          session.flash('errors', { name: 'Danh mục này đã tồn tại' })
          return response.redirect().back()
        }
      }
      // Cập nhật danh mục
      category.name = data.name || category.name
      category.description =
        data.description !== undefined ? data.description : category.description
      await category.save()
      // Ghi log
      await AuditLog.create({
        user_id: auth.user.id,
        action: 'update',
        entity_type: 'app_category',
        entity_id: Number(category.id),
        old_values: JSON.parse(oldData),
        new_values: category.toJSON(),
        ip_address: request.ip(),
        user_agent: request.header('user-agent'),
      })
      session.flash('success', 'Danh mục đã được cập nhật thành công')
      return response.redirect().toRoute('app-categories.index')
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        session.flash('errors', error.messages)
        return response.redirect().back()
      }
      throw error
    }
  }
}
