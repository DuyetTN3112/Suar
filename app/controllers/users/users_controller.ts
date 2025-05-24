import type { HttpContext } from '@adonisjs/core/http'
// New CQRS Commands and Queries
import RegisterUserCommand from '#actions/users/commands/register_user_command'
import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import ApproveUserCommand from '#actions/users/commands/approve_user_command'
import ChangeUserRoleCommand from '#actions/users/commands/change_user_role_command'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
// DTOs
import { RegisterUserDTO } from '#actions/users/dtos/register_user_dto'
import { UpdateUserProfileDTO } from '#actions/users/dtos/update_user_profile_dto'
import { ApproveUserDTO } from '#actions/users/dtos/approve_user_dto'
import { ChangeUserRoleDTO } from '#actions/users/dtos/change_user_role_dto'
import { GetUsersListDTO, UserFiltersDTO } from '#actions/users/dtos/get_users_list_dto'
import { GetUserDetailDTO } from '#actions/users/dtos/get_user_detail_dto'
import { PaginationDTO } from '#actions/shared/index'
// Old actions (to be replaced gradually)
import DeleteUser from '#actions/users/delete_user'
import GetUserMetadata from '#actions/users/get_user_metadata'
import db from '@adonisjs/lucid/services/db'

/**
 * UsersController - Thin Controller following CQRS pattern
 *
 * Responsibilities:
 * 1. Extract data from HTTP request
 * 2. Build DTOs for Commands/Queries
 * 3. Call appropriate Command/Query handlers
 * 4. Return HTTP response
 *
 * NO business logic should be here!
 */
export default class UsersController {
  /**
   * Display paginated list of users for current organization
   * Route: GET /users
   */
  async index(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    // Manual instantiation to avoid DI decorator conflicts
    const getUsersListQuery = new GetUsersListQuery(ctx)
    const getUserMetadata = new GetUserMetadata(ctx)

    // Build DTO for GetUsersListQuery
    const dto = this.buildGetUsersListDTO(request, auth)

    // Execute Query (read-only, cached)
    const users = await getUsersListQuery.handle(dto)

    // Get metadata (roles, statuses) for filters
    const metadata = await getUserMetadata.handle()

    // Return Inertia response
    return inertia.render('users/index', {
      users,
      metadata,
      filters: {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        role_id: dto.filters.roleId,
        status_id: dto.filters.statusId,
        search: dto.filters.search,
      },
    })
  }

  /**
   * API endpoint: Get system users (not in current organization)
   * Route: GET /api/users/system
   * Permission: Superadmin only
   */
  async systemUsersApi(ctx: HttpContext) {
    const { request, response, auth } = ctx

    try {
      // Check permission first
      const hasPermission = await this.checkSuperAdminPermission(auth, response)
      if (!hasPermission) return // Response already sent

      // Manual instantiation
      const getUsersListQuery = new GetUsersListQuery(ctx)

      // Build DTO with exclude_organization_members flag
      const dto = this.buildSystemUsersListDTO(request, auth)

      // Execute Query
      const users = await getUsersListQuery.handle(dto)

      return response.json({
        success: true,
        users,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Show create user form
   * Route: GET /users/create
   */
  async create(ctx: HttpContext) {
    const { inertia } = ctx

    // Manual instantiation
    const getUserMetadata = new GetUserMetadata(ctx)

    const metadata = await getUserMetadata.handle()
    return inertia.render('users/create', { metadata })
  }

  /**
   * Store new user (Register)
   * Route: POST /users
   */
  async store(ctx: HttpContext) {
    const { request, response, session, i18n } = ctx

    // Manual instantiation
    const registerUserCommand = new RegisterUserCommand(ctx)

    // Build DTO from request
    const dto = this.buildRegisterUserDTO(request)

    // Execute Command (write operation with transaction + audit logging)
    await registerUserCommand.handle(dto)

    // Success flash message
    session.flash('success', i18n.t('messages.user_created_successfully'))

    return response.redirect().toRoute('users.index')
  }

  /**
   * Show user detail
   * Route: GET /users/:id
   */
  async show(ctx: HttpContext) {
    const { params, inertia } = ctx

    // Manual instantiation
    const getUserDetailQuery = new GetUserDetailQuery(ctx)

    // Build DTO
    const dto = new GetUserDetailDTO(Number(params.id))

    // Execute Query (cached)
    const user = await getUserDetailQuery.handle(dto)

    return inertia.render('users/show', { user })
  }

  /**
   * Show edit user form
   * Route: GET /users/:id/edit
   */
  async edit(ctx: HttpContext) {
    const { params, inertia } = ctx

    // Manual instantiation
    const getUserDetailQuery = new GetUserDetailQuery(ctx)
    const getUserMetadata = new GetUserMetadata(ctx)

    // Build DTO
    const dto = new GetUserDetailDTO(Number(params.id))

    // Execute Query
    const user = await getUserDetailQuery.handle(dto)
    const metadata = await getUserMetadata.handle()

    return inertia.render('users/edit', { user, metadata })
  }

  /**
   * Update user profile
   * Route: PUT /users/:id
   *
   * Note: This only updates profile information (name, phone, bio, etc.).
   * For admin operations (change role/status), create separate Commands:
   * - ChangeUserRoleCommand
   * - ChangeUserStatusCommand
   */
  async update(ctx: HttpContext) {
    const { params, request, response, session, i18n } = ctx

    // Manual instantiation
    const updateUserProfileCommand = new UpdateUserProfileCommand(ctx)

    // Build DTO from request (only profile fields)
    const dto = this.buildUpdateUserProfileDTO(Number(params.id), request)

    // Execute Command (write operation with transaction + audit logging)
    await updateUserProfileCommand.handle(dto)

    // Success flash message
    session.flash('success', i18n.t('messages.user_updated_successfully'))

    return response.redirect().toRoute('users.show', { id: Number(params.id) })
  }

  /**
   * Delete user (soft delete)
   * Route: DELETE /users/:id
   * TODO: Create RemoveUserCommand to replace DeleteUser action
   */
  async destroy(ctx: HttpContext) {
    const { params, response, session } = ctx

    // Manual instantiation
    const deleteUser = new DeleteUser(ctx)

    const result = await deleteUser.handle({ id: Number(params.id) })
    session.flash(result.success ? 'success' : 'error', result.message)
    return response.redirect().toRoute('users.index')
  }

  /**
   * Show pending approval users page
   * Route: GET /users/pending-approval
   * Permission: Superadmin only
   */
  async pendingApproval(ctx: HttpContext) {
    const { request, inertia, auth } = ctx

    // Check superadmin permission
    const isSuperAdmin = auth.user?.$extras?.organization_role?.id === 1

    if (!isSuperAdmin) {
      // Redirect to users list if not superadmin
      return inertia.location('/users')
    }

    // Manual instantiation
    const getUsersListQuery = new GetUsersListQuery(ctx)
    const getUserMetadata = new GetUserMetadata(ctx)

    // Build DTO for pending users
    const dto = this.buildPendingUsersListDTO(request, auth)

    // Execute Query
    const users = await getUsersListQuery.handle(dto)
    const metadata = await getUserMetadata.handle()

    return inertia.render('users/pending_approval', {
      users,
      metadata,
      filters: {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        search: dto.filters.search,
      },
    })
  }

  /**
   * API: Get pending approval users
   * Route: GET /api/users/pending-approval
   * Permission: Superadmin only
   */
  async pendingApprovalApi(ctx: HttpContext) {
    const { response, auth } = ctx

    try {
      // Check permission
      const hasPermission = await this.checkSuperAdminPermission(auth, response)
      if (!hasPermission) return

      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
      }

      // Query pending users directly (complex query not yet in GetUsersListQuery)
      // TODO: Move this to a dedicated GetPendingUsersQuery
      const pendingUsers = await db
        .from('users as u')
        .join('organization_users as ou', 'u.id', 'ou.user_id')
        .leftJoin('user_details as ud', 'u.id', 'ud.user_id')
        .leftJoin('user_roles as ur', 'u.role_id', 'ur.id')
        .leftJoin('user_status as us', 'u.status_id', 'us.id')
        .where('ou.organization_id', organizationId)
        .where('ou.status', 'pending')
        .whereNull('u.deleted_at')
        .select(
          'u.id',
          'u.email',
          'u.username',
          'ur.id as role_id',
          'ur.name as role_name',
          'us.id as status_id',
          'us.name as status_name',
          'u.created_at'
        )

      // Format response
      const formattedUsers = pendingUsers.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: {
          id: user.role_id,
          name: user.role_name,
        },
        status: {
          id: user.status_id,
          name: user.status_name,
        },
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      }))

      return response.json({
        success: true,
        users: formattedUsers,
        meta: {
          total: pendingUsers.length,
          per_page: pendingUsers.length,
          current_page: 1,
          last_page: 1,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách người dùng chờ phê duyệt.',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * API: Get pending approval count
   * Route: GET /api/users/pending-approval/count
   * Permission: Superadmin only
   */
  async pendingApprovalCount(ctx: HttpContext) {
    const { response, auth } = ctx

    try {
      // Check permission
      const hasPermission = await this.checkSuperAdminPermission(auth, response)
      if (!hasPermission) return

      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
      }

      // Count pending users
      const result = await db
        .from('users as u')
        .join('organization_users as ou', 'u.id', 'ou.user_id')
        .where('ou.organization_id', organizationId)
        .where('ou.status', 'pending')
        .whereNull('u.deleted_at')
        .count('u.id as count')
        .first()

      return response.json({
        success: true,
        count: result?.count || 0,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi đếm số lượng người dùng chờ phê duyệt.',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Approve a pending user in organization
   * Route: PUT /users/:id/approve
   * Permission: Superadmin only
   */
  async approve(ctx: HttpContext) {
    const { params, response, auth } = ctx

    try {
      // Manual instantiation
      const approveUserCommand = new ApproveUserCommand(ctx)

      const organizationId = auth.user?.current_organization_id
      if (!organizationId) {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tổ chức hiện tại',
        })
      }

      // Build DTO
      const dto = new ApproveUserDTO(
        Number(params.id), // userId
        organizationId,
        auth.user!.id // approverId
      )

      // Execute Command
      await approveUserCommand.handle(dto)

      return response.json({
        success: true,
        message: 'Người dùng đã được phê duyệt thành công',
      })
    } catch (error) {
      return response.status(403).json({
        success: false,
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi phê duyệt người dùng',
      })
    }
  }

  /**
   * Change user role in organization
   * Route: PUT /users/:id/role
   * Permission: Superadmin only (checked by stored procedure)
   */
  async updateRole(ctx: HttpContext) {
    const { params, request, response, auth, session, i18n } = ctx

    try {
      // Manual instantiation
      const changeUserRoleCommand = new ChangeUserRoleCommand(ctx)

      // Build DTO
      const dto = new ChangeUserRoleDTO(
        Number(params.id), // targetUserId
        Number(request.input('role_id')), // newRoleId
        auth.user!.id // changerId
      )

      // Execute Command (uses stored procedure with permission checks)
      await changeUserRoleCommand.handle(dto)

      session.flash('success', i18n.t('messages.user_role_updated_successfully'))
      return response.redirect().back()
    } catch (error) {
      session.flash(
        'error',
        error instanceof Error ? error.message : 'Chỉ superadmin mới có thể thay đổi vai trò'
      )
      return response.redirect().back()
    }
  }

  // ===========================
  // Private Helper Methods (DTO Builders)
  // ===========================

  /**
   * Build GetUsersListDTO from request for index page
   */
  private buildGetUsersListDTO(
    request: HttpContext['request'],
    auth: HttpContext['auth']
  ): GetUsersListDTO {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const pagination = new PaginationDTO(page, limit)

    const organizationId = auth.user?.current_organization_id || 0

    const filters = new UserFiltersDTO(
      request.input('search'),
      request.input('role_id'),
      request.input('status_id'),
      2, // exclude_status_id: Don't show inactive users (status_id = 2)
      'approved' // organization_user_status: Only show approved members
    )

    return new GetUsersListDTO(pagination, organizationId, filters)
  }

  /**
   * Build GetUsersListDTO for system users (not in organization)
   */
  private buildSystemUsersListDTO(
    request: HttpContext['request'],
    auth: HttpContext['auth']
  ): GetUsersListDTO {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const pagination = new PaginationDTO(page, limit)

    const organizationId = auth.user?.current_organization_id || 0

    const filters = new UserFiltersDTO(
      request.input('search', ''),
      undefined, // role_id
      undefined, // status_id
      undefined, // exclude_status_id
      undefined, // organization_user_status
      true // exclude_organization_members: Only show users NOT in organization
    )

    return new GetUsersListDTO(pagination, organizationId, filters)
  }

  /**
   * Build GetUsersListDTO for pending users
   */
  private buildPendingUsersListDTO(
    request: HttpContext['request'],
    auth: HttpContext['auth']
  ): GetUsersListDTO {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const pagination = new PaginationDTO(page, limit)

    const organizationId = auth.user?.current_organization_id || 0

    const filters = new UserFiltersDTO(
      request.input('search'),
      undefined, // role_id
      undefined, // status_id
      undefined, // exclude_status_id
      'pending' // organization_user_status: Only pending users
    )

    return new GetUsersListDTO(pagination, organizationId, filters)
  }

  /**
   * Build RegisterUserDTO from request
   */
  private buildRegisterUserDTO(request: HttpContext['request']): RegisterUserDTO {
    return new RegisterUserDTO(
      request.input('username'),
      request.input('email'),
      Number(request.input('role_id')),
      Number(request.input('status_id'))
    )
  }

  /**
   * Build UpdateUserProfileDTO from request
   *
   * Note: Only includes profile fields, not admin fields (role, status, credentials).
   * For changing role/status, use separate Commands in the future.
   */
  private buildUpdateUserProfileDTO(
    userId: number,
    request: HttpContext['request']
  ): UpdateUserProfileDTO {
    return new UpdateUserProfileDTO(userId, request.input('username'), request.input('email'))
  }

  /**
   * Check if user is superadmin of current organization
   * Returns false and sends response if not authorized
   */
  private async checkSuperAdminPermission(
    auth: HttpContext['auth'],
    response: HttpContext['response']
  ): Promise<boolean> {
    const user = auth.user
    if (!user) {
      response.status(401).json({
        success: false,
        message: 'Unauthorized',
      })
      return false
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      response.status(400).json({
        success: false,
        message: 'Không tìm thấy tổ chức hiện tại',
      })
      return false
    }

    // Check if user is superadmin (role_id = 1) in current organization
    const isSuperAdmin = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', user.id)
      .where('role_id', 1)
      .where('status', 'approved')
      .first()

    if (!isSuperAdmin) {
      response.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này',
      })
      return false
    }

    return true
  }
}
