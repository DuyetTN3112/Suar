import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListOrganizations from '#actions/organizations/list_organizations'
import GetOrganization from '#actions/organizations/get_organization'
import SwitchOrganization from '#actions/organizations/switch_organization'
import CreateOrganization from '#actions/organizations/create_organization'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class OrganizationsController {
  /**
   * Hiển thị danh sách tổ chức của người dùng hiện tại
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!

    // Lấy tất cả tổ chức mà người dùng đang là thành viên
    const userOrganizations = await db
      .from('organizations')
      .join('organization_users', 'organizations.id', '=', 'organization_users.organization_id')
      .join('user_roles', 'user_roles.id', '=', 'organization_users.role_id')
      .where('organization_users.user_id', user.id)
      .whereNull('organizations.deleted_at')
      .select('organizations.*', 'user_roles.name as role_name', 'user_roles.id as role_id')

    // Trả về trang hiển thị danh sách tổ chức
    return inertia.render('organizations/index', {
      organizations: userOrganizations,
      currentOrganizationId: user.current_organization_id,
    })
  }

  /**
   * Hiển thị thông tin chi tiết của tổ chức
   */
  async show({ params, inertia, auth, response }: HttpContext) {
    const organization = await Organization.find(params.id)

    if (!organization) {
      return response.status(404).redirect('/errors/not-found')
    }

    // Kiểm tra xem người dùng có phải là thành viên của tổ chức không
    const user = auth.user!
    const membership = await db
      .from('organization_users')
      .where('organization_id', organization.id)
      .where('user_id', user.id)
      .first()

    if (!membership) {
      return response.status(403).redirect('/errors/forbidden')
    }

    // Lấy danh sách thành viên của tổ chức
    const members = await db
      .from('users')
      .join('organization_users', 'users.id', '=', 'organization_users.user_id')
      .join('user_roles', 'user_roles.id', '=', 'organization_users.role_id')
      .where('organization_users.organization_id', organization.id)
      .whereNull('users.deleted_at')
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.full_name',
        'users.email',
        'users.username',
        'organization_users.role_id',
        'user_roles.name as role_name'
      )

    return inertia.render('organizations/show', {
      organization,
      members,
      userRole: membership.role_id,
    })
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
   * Xử lý chuyển đổi tổ chức và chuyển hướng
   */
  async switchAndRedirect({ params, auth, session, response }: HttpContext) {
    const user = auth.user!
    const organizationId = params.id

    // Kiểm tra quyền truy cập vào tổ chức
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()

    if (!membership) {
      return response.status(403).redirect('/errors/forbidden')
    }

    // Cập nhật session và database
    session.put('current_organization_id', Number(organizationId))
    await session.commit()
    await user.merge({ current_organization_id: Number(organizationId) }).save()

    // Chuyển hướng đến trang chủ hoặc trang được lưu trước đó
    const intendedUrl = session.get('intended_url', '/')
    session.forget('intended_url')
    await session.commit()

    return response.redirect(intendedUrl)
  }
}
