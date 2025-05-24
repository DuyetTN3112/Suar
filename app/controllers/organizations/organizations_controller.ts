import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

// CQRS - Commands
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import CreateJoinRequestCommand from '#actions/organizations/commands/create_join_request_command'

// CQRS - Queries
import GetOrganizationsListQuery from '#actions/organizations/queries/get_organizations_list_query'
import GetOrganizationDetailQuery from '#actions/organizations/queries/get_organization_detail_query'

// DTOs
import { CreateOrganizationDTO } from '#actions/organizations/dtos/create_organization_dto'
import { GetOrganizationsListDTO } from '#actions/organizations/dtos/get_organizations_list_dto'
import { GetOrganizationDetailDTO } from '#actions/organizations/dtos/get_organization_detail_dto'

export default class OrganizationsController {
  /**
   * Hiển thị danh sách tổ chức của người dùng hiện tại
   *
   * Sử dụng GetOrganizationsListQuery với caching và filters
   */
  async index(ctx: HttpContext) {
    const { auth, inertia, request } = ctx

    // Manual instantiation
    const getOrganizationsList = new GetOrganizationsListQuery(ctx)

    const user = auth.user!

    // Build DTO from request
    const dto = new GetOrganizationsListDTO(
      Number(request.input('page', 1)),
      Number(request.input('limit', 20)),
      request.input('search'),
      request.input('plan')
    )

    // Execute query with caching
    const result = await getOrganizationsList.execute(dto)

    // Lấy tất cả tổ chức (for "all organizations" view)
    const allOrganizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    // Enhance với thông tin bổ sung
    const enhancedAllOrganizations = await Promise.all(
      allOrganizations.map(async (org) => {
        const ownerInfo = await db
          .from('users')
          .where('id', org.owner_id)
          .select('full_name')
          .first()

        const memberCount = await db
          .from('organization_users')
          .where('organization_id', org.id)
          .count('* as count')
          .first()

        return {
          ...org.toJSON(),
          founded_date: '2023',
          owner: ownerInfo?.full_name || 'Admin',
          employee_count: memberCount?.count || 0,
          project_count: null,
          industry: org.id % 3 === 0 ? 'Công nghệ' : org.id % 3 === 1 ? 'Giáo dục' : 'Tài chính',
          location: org.id % 2 === 0 ? 'Hà Nội' : 'Hồ Chí Minh',
          id: org.id,
        }
      })
    )

    return inertia.render('organizations/index', {
      organizations: result.data,
      pagination: result.pagination,
      currentOrganizationId: user.current_organization_id,
      allOrganizations: enhancedAllOrganizations,
    })
  }

  /**
   * Hiển thị thông tin chi tiết của tổ chức
   *
   * Sử dụng GetOrganizationDetailQuery với caching
   */
  async show(
    { params, inertia, auth, response }: HttpContext,
    getOrganizationDetail: GetOrganizationDetailQuery
  ) {
    const user = auth.user!

    try {
      // Build DTO
      const dto = new GetOrganizationDetailDTO(
        Number(params.id),
        true, // include_owner
        false, // include_stats
        false // include_projects
      )

      // Execute query with permission check
      const result = await getOrganizationDetail.execute(dto)

      // Get members list
      const members = await db
        .from('users')
        .join('organization_users', 'users.id', '=', 'organization_users.user_id')
        .join('user_roles', 'user_roles.id', '=', 'organization_users.role_id')
        .where('organization_users.organization_id', params.id)
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

      // Get user's role
      const membership = await db
        .from('organization_users')
        .where('organization_id', params.id)
        .where('user_id', user.id)
        .first()

      return inertia.render('organizations/show', {
        organization: result,
        members,
        userRole: membership?.role_id || 0,
      })
    } catch (error) {
      if (error.message.includes('không có quyền')) {
        return response.status(403).redirect('/errors/forbidden')
      }
      return response.status(404).redirect('/errors/not-found')
    }
  }

  /**
   * Hiển thị form tạo tổ chức mới
   */
  async create({ inertia }: HttpContext) {
    return inertia.render('organizations/create')
  }

  /**
   * Lưu tổ chức mới vào database
   *
   * Sử dụng CreateOrganizationCommand với transaction
   */
  async store(
    { request, response, session }: HttpContext,
    createOrganization: CreateOrganizationCommand
  ) {
    try {
      // Build DTO from request
      const dto = new CreateOrganizationDTO(
        request.input('name'),
        request.input('slug'),
        request.input('description'),
        request.input('logo'),
        request.input('website'),
        request.input('plan')
      )

      // Execute command
      const organization = await createOrganization.execute(dto)

      session.flash('success', 'Tổ chức đã được tạo thành công')
      return response.redirect().toRoute('organizations.show', { id: organization.id })
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi tạo tổ chức')
      return response.redirect().back()
    }
  }

  /**
   * Chuyển đổi tổ chức hiện tại cho người dùng
   *
   * Sử dụng SwitchOrganizationCommand
   */
  async switchOrganization(
    { request, response, session }: HttpContext,
    switchOrganization: SwitchOrganizationCommand
  ) {
    try {
      const organizationId = Number(request.input('organization_id'))

      // Execute command
      const result = await switchOrganization.execute(organizationId)

      // Check if JSON response is requested
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Đã chuyển đổi tổ chức thành công',
          organization: result,
        })
      }

      session.flash('success', 'Đã chuyển đổi tổ chức thành công')
      return response.redirect('/tasks')
    } catch (error) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: error.message,
        })
      }

      session.flash('error', error.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức')
      return response.redirect().back()
    }
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
   *
   * Sử dụng CreateJoinRequestCommand
   */
  async join(
    { params, auth, session, response, request }: HttpContext,
    createJoinRequest: CreateJoinRequestCommand
  ) {
    const user = auth.user!
    const organizationId = Number(params.id)

    // Kiểm tra xem tổ chức có tồn tại không
    const organization = await Organization.find(organizationId)
    if (!organization) {
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

      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.json({
          success: false,
          message,
          organization: organization.toJSON(),
          membership: existingMembership,
        })
      }
      session.flash('info', message)
      return response.redirect().toRoute('organizations.show', { id: organizationId })
    }

    try {
      // Execute command
      const joinRequest = await createJoinRequest.execute(organizationId)

      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.json({
          success: true,
          message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt',
          organization: organization.toJSON(),
          joinRequest,
        })
      }

      session.flash('success', 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt')
      return response.redirect().toRoute('organizations.index')
    } catch (error) {
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        return response.status(500).json({
          success: false,
          message: error.message || 'Có lỗi xảy ra khi xử lý yêu cầu tham gia tổ chức',
        })
      }
      session.flash('error', error.message || 'Có lỗi xảy ra khi xử lý yêu cầu tham gia tổ chức')
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
