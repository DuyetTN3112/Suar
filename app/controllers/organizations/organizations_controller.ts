import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import { OrganizationUserStatus } from '#constants/organization_constants'

// CQRS - Commands
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import SwitchOrganizationCommand from '#actions/organizations/commands/switch_organization_command'
import CreateJoinRequestCommand from '#actions/organizations/commands/create_join_request_command'
import CreateNotification from '#actions/common/create_notification'

// CQRS - Queries
import GetOrganizationsListQuery from '#actions/organizations/queries/get_organizations_list_query'
import type GetOrganizationDetailQuery from '#actions/organizations/queries/get_organization_detail_query'

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

    if (!auth.user) {
      throw new Error('Vui lòng đăng nhập')
    }
    const user = auth.user

    // Build DTO from request
    const dto = new GetOrganizationsListDTO(
      Number(request.input('page', 1)),
      Number(request.input('limit', 20)),
      request.input('search') as string | undefined,
      request.input('plan') as string | undefined
    )

    // Execute query with caching
    const result = await getOrganizationsList.execute(dto)

    // Lấy tất cả tổ chức (for "all organizations" view)
    const allOrganizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    // Enhance với thông tin bổ sung (batch queries thay vì N+1)
    const orgIds = allOrganizations.map((org) => org.id)

    // Batch query: lấy owner usernames
    const ownerIds = [...new Set(allOrganizations.map((org) => org.owner_id))]
    const owners = (await db
      .from('users')
      .whereIn('id', ownerIds)
      .select('id', 'username')) as Array<{ id: number; username: string }>
    const ownerMap = new Map(owners.map((o) => [o.id, o.username]))

    // Batch query: lấy member counts
    const memberCounts = (await db
      .from('organization_users')
      .whereIn('organization_id', orgIds)
      .groupBy('organization_id')
      .select('organization_id')
      .count('* as count')) as Array<{ organization_id: number; count: number }>
    const memberCountMap = new Map(memberCounts.map((m) => [m.organization_id, Number(m.count)]))

    const enhancedAllOrganizations = allOrganizations.map((org) => ({
      ...org.toJSON(),
      founded_date: '2023',
      owner: ownerMap.get(org.owner_id) || 'Admin',
      employee_count: memberCountMap.get(org.id) || 0,
      project_count: null,
      industry: org.id % 3 === 0 ? 'Công nghệ' : org.id % 3 === 1 ? 'Giáo dục' : 'Tài chính',
      location: org.id % 2 === 0 ? 'Hà Nội' : 'Hồ Chí Minh',
      id: org.id,
    }))

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
    if (!auth.user) {
      throw new Error('Vui lòng đăng nhập')
    }
    const user = auth.user

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
      const members = (await db
        .from('users')
        .join('organization_users', 'users.id', '=', 'organization_users.user_id')
        .leftJoin('organization_roles', 'organization_roles.id', '=', 'organization_users.role_id')
        .where('organization_users.organization_id', params.id as string)
        .whereNull('users.deleted_at')
        .select(
          'users.id',
          'users.username',
          'users.email',
          'organization_users.role_id',
          'organization_roles.name as role_name'
        )) as Array<{
        id: number
        username: string
        email: string
        role_id: number
        role_name: string
      }>

      // Get user's role
      const membership = (await db
        .from('organization_users')
        .where('organization_id', params.id as string)
        .where('user_id', user.id)
        .first()) as { role_id: number } | null

      return await inertia.render('organizations/show', {
        organization: result,
        members,
        userRole: membership?.role_id || 0,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
      if (errorMessage.includes('không có quyền')) {
        response.status(403).redirect('/errors/forbidden')
        return
      }
      response.status(404).redirect('/errors/not-found')
      return
    }
  }

  /**
   * Hiển thị form tạo tổ chức mới
   */
  async create({ inertia }: HttpContext) {
    return await inertia.render('organizations/create')
  }

  /**
   * Lưu tổ chức mới vào database
   *
   * Sử dụng CreateOrganizationCommand với transaction
   */
  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const createOrganization = new CreateOrganizationCommand(ExecutionContext.fromHttp(ctx), new CreateNotification())
    try {
      // Build DTO from request
      const dto = new CreateOrganizationDTO(
        request.input('name') as string,
        request.input('slug') as string,
        request.input('description') as string | undefined,
        request.input('logo') as string | undefined,
        request.input('website') as string | undefined,
        request.input('plan') as string | undefined
      )

      // Execute command
      const organization = await createOrganization.execute(dto)

      session.flash('success', 'Tổ chức đã được tạo thành công')
      response.redirect().toRoute('organizations.show', { id: organization.id })
      return
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo tổ chức'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  /**
   * Chuyển đổi tổ chức hiện tại cho người dùng
   *
   * Sử dụng SwitchOrganizationCommand
   */
  async switchOrganization(ctx: HttpContext) {
    const { request, response, session } = ctx
    const switchOrganization = new SwitchOrganizationCommand(ExecutionContext.fromHttp(ctx))
    try {
      const organizationId = Number(request.input('organization_id'))

      // Execute command
      await switchOrganization.execute(organizationId)

      // Check if JSON response is requested
      const contentType = request.accepts(['html', 'json'])
      if (contentType === 'json') {
        response.json({
          success: true,
          message: 'Đã chuyển đổi tổ chức thành công',
        })
        return
      }

      session.flash('success', 'Đã chuyển đổi tổ chức thành công')
      response.redirect('/tasks')
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi chuyển đổi tổ chức'
      if (request.accepts(['html', 'json']) === 'json') {
        response.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  /**
   * Xử lý chuyển đổi tổ chức và chuyển hướng
   */
  async switchAndRedirect({ params, auth, session, response }: HttpContext) {
    if (!auth.user) {
      throw new Error('Vui lòng đăng nhập')
    }
    const user = auth.user
    const organizationId = params.id as string

    // Kiểm tra quyền truy cập vào tổ chức
    const membership = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()) as { status: string } | null

    if (!membership) {
      response.status(403).redirect('/errors/forbidden')
      return
    }

    // Cập nhật session và database
    session.put('current_organization_id', Number(organizationId))
    await session.commit()
    await user.merge({ current_organization_id: Number(organizationId) }).save()

    // Chuyển hướng đến trang chủ hoặc trang được lưu trước đó
    const intendedUrl = session.get('intended_url', '/') as string
    session.forget('intended_url')
    await session.commit()

    response.redirect(intendedUrl)
  }

  /**
   * Hiển thị danh sách tất cả tổ chức trong hệ thống
   */
  async allOrganizations({ inertia, auth }: HttpContext) {
    if (!auth.user) {
      throw new Error('Vui lòng đăng nhập')
    }
    const user = auth.user
    // Lấy tất cả tổ chức từ database, không phụ thuộc vào người dùng hiện tại
    const organizations = await Organization.query().whereNull('deleted_at').orderBy('id', 'asc')

    // Lấy danh sách tổ chức mà người dùng đã tham gia hoặc đã gửi yêu cầu
    const memberships = (await db
      .from('organization_users')
      .where('user_id', user.id)
      .select('organization_id', 'status')) as Array<{
      organization_id: number
      status: string
    }>

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
  async join(ctx: HttpContext) {
    const { params, auth, session, response, request } = ctx
    const createJoinRequest = new CreateJoinRequestCommand(ExecutionContext.fromHttp(ctx))
    if (!auth.user) {
      throw new Error('Vui lòng đăng nhập')
    }
    const user = auth.user
    const organizationId = Number(params.id)

    // Kiểm tra xem tổ chức có tồn tại không
    const organization = await Organization.find(organizationId)
    if (!organization) {
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        response.status(404).json({
          success: false,
          message: 'Tổ chức không tồn tại',
        })
        return
      }
      session.flash('error', 'Tổ chức không tồn tại')
      response.redirect().back()
      return
    }

    // Kiểm tra xem người dùng đã là thành viên của tổ chức chưa
    const existingMembership = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .first()) as { status: OrganizationUserStatus } | null

    if (existingMembership) {
      const status = existingMembership.status
      let message = ''

      if (status === OrganizationUserStatus.APPROVED) {
        message = 'Bạn đã là thành viên của tổ chức này'
      } else if (status === OrganizationUserStatus.PENDING) {
        message = 'Yêu cầu tham gia tổ chức của bạn đang chờ được duyệt'
      } else {
        // status === OrganizationUserStatus.REJECTED
        message =
          'Yêu cầu tham gia của bạn đã bị từ chối. Bạn có thể liên hệ với quản trị viên tổ chức'
      }

      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        response.json({
          success: false,
          message,
          organization: organization.toJSON(),
          membership: existingMembership,
        })
        return
      }
      session.flash('info', message)
      response.redirect().toRoute('organizations.show', { id: organizationId })
      return
    }

    try {
      // Execute command
      await createJoinRequest.execute(organizationId)

      const contentType = request.accepts(['html', 'json'])
      const xmlHttpHeader = request.header('X-Requested-With')
      const isXMLHttp = xmlHttpHeader === 'XMLHttpRequest'

      if (contentType === 'json' || isXMLHttp) {
        response.json({
          success: true,
          message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt',
          organization: organization.toJSON(),
        })
        return
      }
      session.flash('success', 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt')
      response.redirect().toRoute('organizations.index')
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý yêu cầu tham gia tổ chức'
      if (
        request.accepts(['html', 'json']) === 'json' ||
        request.header('X-Requested-With') === 'XMLHttpRequest'
      ) {
        response.status(500).json({
          success: false,
          message: errorMessage,
        })
        return
      }
      session.flash('error', errorMessage)
      response.redirect().back()
      return
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
      response.json(organizations)
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi lấy danh sách tổ chức'
      response.status(500).json({
        error: 'Có lỗi xảy ra khi lấy danh sách tổ chức',
        details: errorMessage,
      })
      return
    }
  }
}
