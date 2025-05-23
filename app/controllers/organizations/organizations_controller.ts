import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ListOrganizations from '#actions/organizations/list_organizations'
import GetOrganization from '#actions/organizations/get_organization'
import SwitchOrganization from '#actions/organizations/switch_organization'
import CreateOrganization from '#actions/organizations/create_organization'
import CreateJoinRequest from '#actions/organizations/create_join_request'
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
    // Lấy tất cả các tổ chức trong hệ thống
    const allOrganizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')
    // Thêm các thông tin bổ sung cho tất cả tổ chức
    const enhancedAllOrganizations = await Promise.all(
      allOrganizations.map(async (org) => {
        // Lấy thông tin chủ sở hữu
        const ownerInfo = await db
          .from('users')
          .where('id', org.owner_id)
          .select('full_name')
          .first()
        // Đếm số lượng thành viên trong tổ chức
        const memberCount = await db
          .from('organization_users')
          .where('organization_id', org.id)
          .count('* as count')
          .first()
        return {
          ...org.toJSON(),
          // Thêm các trường thông tin bổ sung
          founded_date: '2023', // Giả lập năm thành lập
          owner: ownerInfo?.full_name || 'Admin',
          employee_count: memberCount?.count || 0,
          project_count: null, // Để null để phía client hiện "Chưa có thông tin"
          industry: org.id % 3 === 0 ? 'Công nghệ' : org.id % 3 === 1 ? 'Giáo dục' : 'Tài chính',
          location: org.id % 2 === 0 ? 'Hà Nội' : 'Hồ Chí Minh',
          id: org.id, // Thêm ID vào dữ liệu để có thể truy cập
        }
      })
    )
    // Tạo map để tra cứu nhanh thông tin tổ chức theo ID
    const orgMap: Record<number, any> = {}
    enhancedAllOrganizations.forEach((org) => {
      orgMap[org.id] = org
    })
    // Thêm thông tin chi tiết cho tổ chức của người dùng
    const enhancedUserOrganizations = userOrganizations.map((userOrg) => {
      // Lấy thông tin chi tiết từ orgMap
      const orgDetails = orgMap[userOrg.id]
      if (orgDetails) {
        return {
          ...userOrg,
          founded_date: orgDetails.founded_date,
          owner: orgDetails.owner,
          employee_count: orgDetails.employee_count,
          project_count: orgDetails.project_count,
          industry: orgDetails.industry,
          location: orgDetails.location,
        }
      }
      return userOrg
    })

    // Trả về trang hiển thị danh sách tổ chức
    return inertia.render('organizations/index', {
      organizations: enhancedUserOrganizations,
      currentOrganizationId: user.current_organization_id,
      allOrganizations: enhancedAllOrganizations,
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

  /**
   * Hiển thị danh sách tất cả tổ chức trong hệ thống
   */
  async allOrganizations({ inertia, auth }: HttpContext) {
    const user = auth.user!
    // Lấy tất cả tổ chức từ database, không phụ thuộc vào người dùng hiện tại
    const organizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    // Lấy danh sách tổ chức mà người dùng đã tham gia hoặc đã gửi yêu cầu
    const memberships = await db
      .from('organization_users')
      .where('user_id', user.id)
      .select('organization_id', 'status')

    // Ánh xạ trạng thái thành viên vào danh sách tổ chức
    const enhancedOrganizations = organizations.map((org) => {
      const membership = memberships.find((m) => m.organization_id === org.id)
      return {
        ...org.toJSON(),
        membership_status: membership ? membership.status : null,
      }
    })

    // Trả về trang hiển thị danh sách tất cả tổ chức
    return inertia.render('organizations/all', {
      organizations: enhancedOrganizations,
      currentOrganizationId: user.current_organization_id,
    })
  }

  /**
   * Xử lý yêu cầu tham gia tổ chức
   */
  async join(ctx: HttpContext) {
    const { params, auth, session, response, request } = ctx
    const user = auth.user!
    const organizationId = params.id
    const createJoinRequest = new CreateJoinRequest(ctx)

    // Kiểm tra xem tổ chức có tồn tại không
    const organization = await Organization.find(organizationId)
    if (!organization) {
      // Kiểm tra nếu là request API/AJAX
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.status(404).json({
          success: false,
          message: 'Tổ chức không tồn tại',
        })
      }
      session.flash('error', 'Tổ chức không tồn tại')
      return response.redirect().back()
    }

    // Kiểm tra xem người dùng đã là thành viên của tổ chức chưa
    const existingMembership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()

    if (existingMembership) {
      // Nếu đã là thành viên hoặc đã gửi yêu cầu
      const status = existingMembership.status
      let message = ''

      if (status === 'approved') {
        message = 'Bạn đã là thành viên của tổ chức này'
      } else if (status === 'pending') {
        message = 'Yêu cầu tham gia tổ chức của bạn đang chờ được duyệt'
      } else if (status === 'rejected') {
        message =
          'Yêu cầu tham gia của bạn đã bị từ chối. Bạn có thể liên hệ với quản trị viên tổ chức'
      }

      // Kiểm tra nếu là request API/AJAX
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.json({
          success: false,
          message,
          organization: {
            id: organization.id,
            name: organization.name,
            description: organization.description,
            logo: organization.logo,
            website: organization.website,
            plan: organization.plan,
          },
          membership: existingMembership,
        })
      }
      session.flash('info', message)
      return response.redirect().toRoute('organizations.show', { id: organizationId })
    }

    try {
      // Tạo yêu cầu tham gia tổ chức thay vì thêm trực tiếp
      const result = await createJoinRequest.handle({
        organizationId: Number(organizationId),
      })

      // Kiểm tra nếu là request API/AJAX
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.json({
          success: result.success,
          message: result.message,
          organization: {
            id: organization.id,
            name: organization.name,
            description: organization.description,
            logo: organization.logo,
            website: organization.website,
            plan: organization.plan,
          },
          joinRequest: result.joinRequest,
        })
      }

      session.flash(result.success ? 'success' : 'error', result.message)
      return response.redirect().toRoute('organizations.index')
    } catch (error) {
      // Kiểm tra nếu là request API/AJAX
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.status(500).json({
          success: false,
          message: 'Có lỗi xảy ra khi xử lý yêu cầu tham gia tổ chức',
          error: error.message,
        })
      }
      session.flash('error', 'Có lỗi xảy ra khi xử lý yêu cầu tham gia tổ chức')
      return response.redirect().back()
    }
  }

  /**
   * API endpoint cung cấp danh sách tổ chức
   */
  async apiListOrganizations({ response }: HttpContext) {
    try {
      // Lấy tất cả tổ chức từ database, không phụ thuộc vào người dùng hiện tại
      const organizations = await Organization.query()
        .whereNull('deleted_at')
        .orderBy('id', 'asc')
        .select('id', 'name', 'description', 'logo', 'website', 'plan')
      return response.json(organizations)
    } catch (error) {
      return response.status(500).json({
        error: 'Có lỗi xảy ra khi lấy danh sách tổ chức',
        details: error.message,
      })
    }
  }
}
