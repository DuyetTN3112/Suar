import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListApps from '#actions/apps/list_apps'
import GetApp from '#actions/apps/get_app'
import CreateApp from '#actions/apps/create_app'
import UpdateApp from '#actions/apps/update_app'
import DeleteApp from '#actions/apps/delete_app'
import ListAppCategories from '#actions/app_categories/list_app_categories'

export default class AppsController {
  @inject()
  async index(
    { request, inertia }: HttpContext,
    listApps: ListApps,
    listAppCategories: ListAppCategories
  ) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const categoryId = request.input('category_id')
    const connected = request.input('connected')
    const search = request.input('search')
    const options = {
      page,
      limit,
      category_id: categoryId ? Number.parseInt(categoryId) : undefined,
      connected: connected === 'true' ? true : connected === 'false' ? false : undefined,
      search,
    }
    const apps = await listApps.handle(options)
    const categoriesResponse = await listAppCategories.handle({ limit: 100 })
    const categories = categoriesResponse.all()
    return inertia.render('apps/index', {
      apps,
      categories,
      filters: options,
    })
  }

  @inject()
  async create({ inertia }: HttpContext, listAppCategories: ListAppCategories) {
    const categoriesResponse = await listAppCategories.handle({ limit: 100 })
    const categories = categoriesResponse.all()
    return inertia.render('apps/create', { categories })
  }

  @inject()
  async store({ request, response, session }: HttpContext, createApp: CreateApp) {
    try {
      const data = request.only(['name', 'logo', 'description', 'category_id', 'connected'])
      if (data.category_id) {
        data.category_id = Number.parseInt(data.category_id)
      }
      if (data.connected) {
        data.connected = data.connected === 'true'
      }
      await createApp.handle({ data })
      session.flash('success', 'Ứng dụng đã được tạo thành công')
      return response.redirect().toRoute('apps.index')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo ứng dụng')
      return response.redirect().back()
    }
  }

  @inject()
  async show({ params, inertia }: HttpContext, getApp: GetApp) {
    const app = await getApp.handle({ id: Number.parseInt(params.id) })
    return inertia.render('apps/show', { app })
  }

  @inject()
  async edit(
    { params, inertia }: HttpContext,
    getApp: GetApp,
    listAppCategories: ListAppCategories
  ) {
    const app = await getApp.handle({ id: Number.parseInt(params.id) })
    const categoriesResponse = await listAppCategories.handle({ limit: 100 })
    const categories = categoriesResponse.all()
    return inertia.render('apps/edit', { app, categories })
  }

  @inject()
  async update({ params, request, response, session }: HttpContext, updateApp: UpdateApp) {
    try {
      const data = request.only(['name', 'logo', 'description', 'category_id', 'connected'])
      if (data.category_id) {
        data.category_id = Number.parseInt(data.category_id)
      }
      if (data.connected !== undefined) {
        data.connected = data.connected === 'true'
      }
      await updateApp.handle({ id: Number.parseInt(params.id), data })
      session.flash('success', 'Ứng dụng đã được cập nhật thành công')
      return response.redirect().toRoute('apps.show', { id: Number.parseInt(params.id) })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật ứng dụng')
      return response.redirect().back()
    }
  }

  @inject()
  async destroy({ params, response, session }: HttpContext, deleteApp: DeleteApp) {
    try {
      await deleteApp.handle({ id: Number.parseInt(params.id) })
      session.flash('success', 'Ứng dụng đã được xóa thành công')
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi xóa ứng dụng')
    }
    return response.redirect().toRoute('apps.index')
  }
}
