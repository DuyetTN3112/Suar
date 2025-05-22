import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListAppCategories from '#actions/app_categories/list_app_categories'
import CreateCategory from '#actions/app_categories/create_category'
import UpdateCategory from '#actions/app_categories/update_category'
import DeleteCategory from '#actions/app_categories/delete_category'

export default class AppCategoriesController {
  @inject()
  async index({ request, inertia }: HttpContext, listAppCategories: ListAppCategories) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search')
    const options = { page, limit, search }
    const categoriesResponse = await listAppCategories.handle(options)
    const categories = categoriesResponse.all()
    return inertia.render('app_categories/index', { categories })
  }

  @inject()
  async create({ inertia }: HttpContext) {
    return inertia.render('app_categories/create')
  }

  @inject()
  async store({ response, session }: HttpContext, createCategory: CreateCategory) {
    try {
      await createCategory.execute()
      return response.redirect().toRoute('app_categories.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo danh mục')
      return response.redirect().back()
    }
  }

  @inject()
  async edit({ params, inertia }: HttpContext, listAppCategories: ListAppCategories) {
    // Tìm danh mục cần sửa
    const categoriesResponse = await listAppCategories.handle()
    const categories = categoriesResponse.all()
    const category = categories.find((c: any) => c.id === Number.parseInt(params.id))
    if (!category) {
      return inertia.location('/app_categories')
    }

    return inertia.render('app_categories/edit', { category })
  }

  @inject()
  async update({ response, session }: HttpContext, updateCategory: UpdateCategory) {
    try {
      await updateCategory.execute()
      return response.redirect().toRoute('app_categories.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật danh mục')
      return response.redirect().back()
    }
  }

  @inject()
  async destroy({ response, session }: HttpContext, deleteCategory: DeleteCategory) {
    try {
      await deleteCategory.execute()
      return response.redirect().toRoute('app_categories.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi xóa danh mục')
      return response.redirect().back()
    }
  }
}
