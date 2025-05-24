import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import OrganizationUser from '#models/organization_user'

// CQRS - Commands
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import ProcessJoinRequestCommand from '#actions/organizations/commands/process_join_request_command'
import CreateNotification from '#actions/common/create_notification'

// CQRS - Queries
import GetOrganizationMembersQuery from '#actions/organizations/queries/get_organization_members_query'
import GetPendingRequestsQuery from '#actions/organizations/queries/get_pending_requests_query'
import GetOrganizationMetadataQuery from '#actions/organizations/queries/get_organization_metadata_query'

// DTOs
import { GetOrganizationMembersDTO } from '#actions/organizations/dtos/get_organization_members_dto'
import { AddMemberDTO } from '#actions/organizations/dtos/add_member_dto'
import { RemoveMemberDTO } from '#actions/organizations/dtos/remove_member_dto'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/update_member_role_dto'
import { InviteUserDTO } from '#actions/organizations/dtos/invite_user_dto'
import { ProcessJoinRequestDTO } from '#actions/organizations/dtos/process_join_request_dto'

export default class MembersController {
  /**
   * Hiển thị trang quản lý thành viên tổ chức
   *
   * Sử dụng GetOrganizationMembersQuery và GetPendingRequestsQuery
   */
  async index(ctx: HttpContext) {
    const { params, inertia, auth } = ctx

    // Manual instantiation
    const getOrganizationMembers = new GetOrganizationMembersQuery(ctx)
    const getPendingRequests = new GetPendingRequestsQuery(ctx)
    const getMetadata = new GetOrganizationMetadataQuery(ctx)

    const user = auth.user!
    const organizationId = Number(params.id)

    try {
      // Get members list with DTO
      const membersDTO = new GetOrganizationMembersDTO(
        organizationId,
        1, // page
        100, // limit - get all for management page
        undefined, // roleId filter
        undefined // search
      )

      const membersResult = await getOrganizationMembers.execute(membersDTO)

      // Get pending requests
      const pendingRequests = await getPendingRequests.execute(organizationId)

      // Get metadata (roles)
      const metadata = await getMetadata.execute()

      // Get organization info
      const organization = await db
        .from('organizations')
        .where('id', organizationId)
        .whereNull('deleted_at')
        .first()

      // Get user's role
      const membership = await db
        .from('organization_users')
        .where('organization_id', organizationId)
        .where('user_id', user.id)
        .first()

      return inertia.render('organizations/members/index', {
        organization,
        members: membersResult.data,
        roles: metadata.roles,
        userRole: membership?.role_id || 0,
        pendingRequests,
      })
    } catch (error) {
      console.error('[MembersController.index] Error:', error)
      return inertia.render('organizations/members/index', {
        organization: null,
        members: [],
        roles: [],
        userRole: 0,
        pendingRequests: [],
      })
    }
  }

  /**
   * Hiển thị trang các yêu cầu tham gia tổ chức đang chờ duyệt
   *
   * Sử dụng GetPendingRequestsQuery
   */
  async pendingRequests(
    { params, inertia, response }: HttpContext,
    getPendingRequests: GetPendingRequestsQuery
  ) {
    try {
      const organizationId = Number(params.id)
      const requests = await getPendingRequests.execute(organizationId)

      // Get organization info
      const organization = await db
        .from('organizations')
        .where('id', organizationId)
        .whereNull('deleted_at')
        .first()

      if (!organization) {
        return response.redirect().toRoute('organizations.index')
      }

      return inertia.render('organizations/members/pending_requests', {
        organization,
        pendingRequests: requests,
      })
    } catch (error) {
      console.error('[MembersController.pendingRequests] Error:', error)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Thêm thành viên mới vào tổ chức
   *
   * Sử dụng AddMemberCommand
   */
  async add(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    // Manual instantiation with CreateNotification dependency
    const addMember = new AddMemberCommand(ctx, new CreateNotification(ctx))

    try {
      const { email, roleId } = request.body()

      const dto = new AddMemberDTO(Number(params.id), email, Number(roleId))

      await addMember.execute(dto)

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Thêm thành viên thành công',
        })
      }

      session.flash('success', 'Thêm thành viên thành công')
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    } catch (error) {
      console.error('[MembersController.add] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thêm thành viên'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Mời người dùng vào tổ chức
   *
   * Sử dụng InviteUserCommand
   */
  async invite(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    // Manual instantiation
    const inviteUser = new InviteUserCommand(ctx)

    try {
      const { email, roleId } = request.body()

      const dto = new InviteUserDTO(Number(params.id), email, Number(roleId))

      const invitation = await inviteUser.execute(dto)

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Gửi lời mời thành công',
          invitation,
        })
      }

      session.flash('success', 'Gửi lời mời thành công')
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    } catch (error) {
      console.error('[MembersController.invite] Error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi gửi lời mời'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Xử lý yêu cầu tham gia tổ chức (duyệt/từ chối)
   *
   * Sử dụng ProcessJoinRequestCommand
   */
  async processRequest(
    { params, request, response, session }: HttpContext,
    processJoinRequest: ProcessJoinRequestCommand
  ) {
    try {
      const { action } = request.body()

      if (!['approve', 'reject'].includes(action)) {
        const errorMessage = 'Hành động không hợp lệ'

        if (request.accepts(['html', 'json']) === 'json') {
          return response.status(400).json({
            success: false,
            message: errorMessage,
          })
        }

        session.flash('error', errorMessage)
        return response.redirect().toRoute('organizations.members.pending_requests', {
          id: params.id,
        })
      }

      // Find the join request to get requestId
      const joinRequest = await db
        .from('organization_join_requests')
        .where('organization_id', Number(params.id))
        .where('user_id', Number(params.userId))
        .where('status', 'pending')
        .first()

      if (!joinRequest) {
        throw new Error('Không tìm thấy yêu cầu tham gia')
      }

      const dto = new ProcessJoinRequestDTO(
        joinRequest.id,
        action === 'approve',
        undefined // optional reason
      )

      await processJoinRequest.execute(dto)

      const successMessage =
        action === 'approve' ? 'Duyệt yêu cầu thành công' : 'Từ chối yêu cầu thành công'

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: successMessage,
        })
      }

      session.flash('success', successMessage)
      return response.redirect().toRoute('organizations.members.pending_requests', {
        id: params.id,
      })
    } catch (error) {
      console.error('[MembersController.processRequest] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xử lý yêu cầu'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.pending_requests', {
        id: params.id,
      })
    }
  }

  /**
   * Thêm người dùng trực tiếp vào tổ chức (cho admin)
   *
   * Sử dụng AddMemberCommand - tìm user trước rồi dùng email
   */
  async addDirect(
    { params, request, response, session }: HttpContext,
    addMember: AddMemberCommand
  ) {
    try {
      const { userId, roleId } = request.body()

      // Tìm user để lấy email
      const user = await db.from('users').where('id', Number(userId)).first()

      if (!user) {
        throw new Error('Không tìm thấy người dùng')
      }

      const dto = new AddMemberDTO(Number(params.id), user.email, Number(roleId))

      await addMember.execute(dto)

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Thêm thành viên thành công',
        })
      }

      session.flash('success', 'Thêm thành viên thành công')
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    } catch (error) {
      console.error('[MembersController.addDirect] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thêm thành viên'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Xóa thành viên khỏi tổ chức
   *
   * Sử dụng RemoveMemberCommand
   */
  async remove(
    { params, request, response, session }: HttpContext,
    removeMember: RemoveMemberCommand
  ) {
    try {
      const dto = new RemoveMemberDTO(Number(params.id), Number(params.userId))

      await removeMember.execute(dto)

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Xóa thành viên thành công',
        })
      }

      session.flash('success', 'Xóa thành viên thành công')
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    } catch (error) {
      console.error('[MembersController.remove] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa thành viên'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Cập nhật vai trò của thành viên trong tổ chức
   *
   * Sử dụng UpdateMemberRoleCommand
   */
  async updateRole(
    { params, request, response, session }: HttpContext,
    updateMemberRole: UpdateMemberRoleCommand
  ) {
    try {
      const { roleId } = request.body()

      const dto = new UpdateMemberRoleDTO(Number(params.id), Number(params.userId), Number(roleId))

      await updateMemberRole.execute(dto)

      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: 'Cập nhật vai trò thành công',
        })
      }

      session.flash('success', 'Cập nhật vai trò thành công')
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    } catch (error) {
      console.error('[MembersController.updateRole] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật vai trò'

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      session.flash('error', errorMessage)
      return response.redirect().toRoute('organizations.members.index', { id: params.id })
    }
  }

  /**
   * Thêm nhiều người dùng vào tổ chức (batch operation)
   *
   * Sử dụng AddMemberCommand trong loop
   */
  async addUsers(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    // Manual instantiation with CreateNotification dependency
    const addMember = new AddMemberCommand(ctx, new CreateNotification(ctx))

    const user = auth.user
    // Lấy tổ chức hiện tại của người dùng
    const organizationId = user?.current_organization_id
    if (!organizationId) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: 'Không tìm thấy tổ chức hiện tại',
        })
      }
      session.flash('error', 'Không tìm thấy tổ chức hiện tại')
      return response.redirect().back()
    }

    // Kiểm tra quyền - chỉ superadmin của tổ chức mới có thể thêm người dùng
    const isSuperAdmin = await this.checkIsSuperAdminInOrg(user.id, organizationId)
    if (!isSuperAdmin) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(403).json({
          success: false,
          message: 'Bạn không có quyền thêm người dùng vào tổ chức',
        })
      }
      session.flash('error', 'Bạn không có quyền thêm người dùng vào tổ chức')
      return response.redirect().back()
    }

    // Lấy danh sách user_ids từ request
    const userIds = request.input('user_ids', [])
    if (!Array.isArray(userIds) || userIds.length === 0) {
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một người dùng để thêm vào tổ chức',
        })
      }
      session.flash('error', 'Vui lòng chọn ít nhất một người dùng để thêm vào tổ chức')
      return response.redirect().back()
    }

    try {
      // Vai trò mặc định là 3 (User)
      const defaultRoleId = 3

      // Thêm từng người dùng vào tổ chức sử dụng AddMemberCommand
      const results = []

      for (const userId of userIds) {
        try {
          // Tìm user để lấy email
          const targetUser = await db.from('users').where('id', Number(userId)).first()

          if (!targetUser) {
            results.push({
              user_id: userId,
              status: 'skipped',
              message: 'Không tìm thấy người dùng',
            })
            continue
          }

          // Kiểm tra xem người dùng đã tồn tại trong tổ chức chưa
          const existingMember = await OrganizationUser.query()
            .where('user_id', userId)
            .where('organization_id', organizationId)
            .first()

          if (existingMember) {
            results.push({
              user_id: userId,
              status: 'skipped',
              message: 'Người dùng đã là thành viên của tổ chức',
            })
            continue
          }

          // Sử dụng AddMemberCommand
          const dto = new AddMemberDTO(organizationId, targetUser.email, defaultRoleId)
          await addMember.execute(dto)

          results.push({
            user_id: userId,
            status: 'added',
            message: 'Thêm thành công',
          })
        } catch (error) {
          console.error(`[MembersController.addUsers] Error adding user ${userId}:`, error)
          results.push({
            user_id: userId,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Lỗi không xác định',
          })
        }
      }

      // Đếm số lượng người dùng đã thêm thành công
      const addedCount = results.filter((r) => r.status === 'added').length

      // Trả về kết quả dựa vào loại request
      if (request.accepts(['html', 'json']) === 'json') {
        return response.json({
          success: true,
          message: `Đã thêm ${addedCount} người dùng vào tổ chức thành công`,
          results,
        })
      }

      // Flash thông báo thành công
      session.flash('success', `Đã thêm ${addedCount} người dùng vào tổ chức thành công`)
      // Chuyển hướng về trang danh sách thành viên của tổ chức
      return response.redirect().toRoute('organizations.members.index', { id: organizationId })
    } catch (error) {
      console.error('[MembersController.addUsers] Error:', error)

      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(500).json({
          success: false,
          message: 'Đã xảy ra lỗi khi thêm người dùng vào tổ chức',
          error: error.message,
        })
      }
      session.flash('error', 'Đã xảy ra lỗi khi thêm người dùng vào tổ chức')
      return response.redirect().back()
    }
  }

  // Hàm kiểm tra xem người dùng có phải là superadmin của tổ chức không
  private async checkIsSuperAdminInOrg(userId: number, organizationId: number): Promise<boolean> {
    const orgUser = await OrganizationUser.query()
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .first()
    return orgUser?.role_id === 1 // 1 = Superadmin
  }
}
