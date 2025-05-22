import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListOrganizations from '#actions/organizations/list_organizations'
import GetOrganization from '#actions/organizations/get_organization'
import SwitchOrganization from '#actions/organizations/switch_organization'
import CreateOrganization from '#actions/organizations/create_organization'

@inject()
export default class OrganizationsController {
  /**
   * Hiển thị danh sách tổ chức của người dùng
   */
  async index({ inertia }: HttpContext, listOrganizations: ListOrganizations) {
    const result = await listOrganizations.handle()
    return inertia.render('organizations/index', result)
  }

  /**
   * Hiển thị form tạo tổ chức mới
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('organizations/create')
  }

  /**
   * Lưu tổ chức mới vào database
   */
  @inject()
  async store({ request, response, session }: HttpContext, createOrganization: CreateOrganization) {
    try {
      const data = {
        name: request.input('name'),
        slug: request.input('slug'),
        description: request.input('description'),
        logo: request.input('logo'),
        website: request.input('website'),
        plan: request.input('plan'),
      }
      const result = await createOrganization.handle(data)
      if (result.success) {
        session.flash('success', result.message)
        return response.redirect().toRoute('organizations.show', { id: result.organization!.id })
      } else {
        session.flash('error', result.message)
        return response.redirect().back()
      }
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo tổ chức')
      return response.redirect().back()
    }
  }

  /**
   * Hiển thị chi tiết tổ chức
   */
  async show(
    { params, inertia, response, session }: HttpContext,
    getOrganization: GetOrganization
  ) {
    const result = await getOrganization.handle(Number(params.id))
    if (!result.success) {
      session.flash('error', result.message || '')
      return response.redirect().toRoute('organizations.index')
    }
    return inertia.render('organizations/show', {
      organization: result.organization,
      userRole: result.userRole,
    })
  }

  /**
   * Chuyển đổi tổ chức hiện tại cho người dùng
   */
  async switchOrganization(
    { request, response, session }: HttpContext,
    switchOrganization: SwitchOrganization
  ) {
    const { organization_id: organizationId } = request.only(['organization_id'])
    const result = await switchOrganization.handle({ organizationId: Number(organizationId) })
    // Kiểm tra nếu request yêu cầu JSON response
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json(result)
    }
    // Nếu thành công, flash thông báo và chuyển hướng về trang tasks
    if (result.success) {
      session.flash('success', result.message || 'Đã chuyển đổi tổ chức thành công')
      return response.redirect('/tasks')
    }
    // Nếu thất bại, flash lỗi và quay lại trang trước
    session.flash('error', result.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức')
    return response.redirect().back()
  }

  /**
   * Chuyển đổi tổ chức và chuyển hướng (phương thức GET)
   */
  async switchAndRedirect(
    { params, response, session, auth }: HttpContext,
    switchOrganization: SwitchOrganization
  ) {
    const result = await switchOrganization.handle({ organizationId: Number(params.id) })
    if (result.success) {
      // Cập nhật current_organization_id trong database (đề phòng action không cập nhật)
      try {
        const user = auth.user!
        await user.merge({ current_organization_id: Number(params.id) }).save()
        console.log(
          `[OrganizationsController] Đã cập nhật current_organization_id trong database: ${Number(params.id)}`
        )
      } catch (error) {
        console.error('[OrganizationsController] Lỗi khi cập nhật database:', error)
      }
      session.flash('success', result.message || 'Đã chuyển đổi tổ chức thành công')
      return response.redirect('/tasks')
    }
    session.flash('error', result.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức')
    return response.redirect().back()
  }
}
