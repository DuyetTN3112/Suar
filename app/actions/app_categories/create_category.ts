import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import AppCategory from '#models/app_category'
import AuditLog from '#models/audit_log'
import { createAppCategoryValidator } from '#validators/app'

type CategoryData = {
  name: string
  description: string | null
  slug: string
  icon: string | null
  order: number
}

@inject()
export default class CreateCategory {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: CategoryData }) {
    // Kiểm tra xem slug đã tồn tại chưa
    const existingCategory = await AppCategory.query().where('slug', data.slug).first()
    if (existingCategory) {
      throw new Error('Slug đã tồn tại, vui lòng chọn slug khác')
    }
    // Tạo danh mục mới
    const category = await AppCategory.create(data)
    return category
  }

  async execute() {
    const { request, response, session, auth, params } = this.ctx

    if (!auth.user) {
      session.flash('error', 'Bạn cần đăng nhập để thực hiện hành động này')
      return response.redirect().back()
    }

    // Kiểm tra xem người dùng có quyền tạo danh mục không
    if (auth.user.role_id !== 1) {
      session.flash('error', 'Bạn không có quyền thực hiện hành động này')
      return response.redirect().toRoute('app-categories.index')
    }

    try {
      // Xác thực dữ liệu đầu vào
      const data = await createAppCategoryValidator.validate(request.all())
      // Kiểm tra xem danh mục đã tồn tại chưa
      const existingCategory = await AppCategory.findBy('name', data.name)
      if (existingCategory) {
        session.flash('errors', { name: 'Danh mục này đã tồn tại' })
        return response.redirect().back()
      }
      // Tạo danh mục mới
      const category = await AppCategory.create({
        name: data.name,
        description: data.description || '',
      })
      // Ghi log
      await AuditLog.create({
        user_id: auth.user.id,
        action: 'create',
        entity_type: 'app_category',
        entity_id: Number(category.id),
        new_values: category.toJSON(),
        ip_address: request.ip(),
        user_agent: request.header('user-agent'),
      })
      session.flash('success', 'Danh mục đã được tạo thành công')
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
