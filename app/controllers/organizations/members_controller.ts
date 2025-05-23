import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AddMember from '#actions/organizations/add_member'
import RemoveMember from '#actions/organizations/remove_member'
import InviteUser from '#actions/organizations/invite_user'
import ProcessJoinRequest from '#actions/organizations/process_join_request'
import GetPendingRequests from '#actions/organizations/get_pending_requests'
import AddUserToOrganization from '#actions/organizations/add_user_to_organization'
import ManageMembers from '#actions/organizations/manage_members'
import UpdateMemberRole from '#actions/organizations/update_member_role'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'

@inject()
export default class MembersController {
  @inject()
  private addMember!: AddMember
  @inject()
  private removeMember!: RemoveMember
  @inject()
  private inviteUser!: InviteUser
  @inject()
  private processJoinRequest!: ProcessJoinRequest
  @inject()
  private getPendingRequests!: GetPendingRequests
  @inject()
  private addUserToOrganization!: AddUserToOrganization
  @inject()
  private manageMembers!: ManageMembers
  @inject()
  private updateMemberRole!: UpdateMemberRole

  /**
   * Hiển thị trang quản lý thành viên tổ chức
   */
  async index({ params, inertia, response, session }: HttpContext) {
    const { id } = params
    if (!this.manageMembers) {
      console.error('ManageMembers service không được inject đúng cách')
      session.flash('error', 'Đã xảy ra lỗi khi tải dữ liệu')
      return response.redirect().toRoute('organizations.index')
    }
    const result = await this.manageMembers.handle(id)

    if (!result.success) {
      return response.redirect().toRoute('organizations.index')
    }

    // Lấy thêm danh sách yêu cầu đang chờ duyệt cho superadmin
    if (!this.getPendingRequests) {
      console.error('GetPendingRequests service không được inject đúng cách')
      return inertia.render('organizations/members/index', {
        organization: result.organization,
        members: result.members,
        roles: result.roles,
        userRole: result.userRole,
        pendingRequests: [],
      })
    }
    const pendingRequestsResult = await this.getPendingRequests.handle(Number(id))
    const pendingRequests = pendingRequestsResult.success
      ? pendingRequestsResult.pendingRequests
      : []

    return inertia.render('organizations/members/index', {
      organization: result.organization,
      members: result.members,
      roles: result.roles,
      userRole: result.userRole,
      pendingRequests: pendingRequests,
    })
  }

  /**
   * Hiển thị trang các yêu cầu tham gia tổ chức đang chờ duyệt
   */
  async pendingRequests({ params, inertia, response }: HttpContext) {
    const { id } = params
    const result = await this.getPendingRequests.handle(Number(id))

    if (!result.success) {
      return response.redirect().toRoute('organizations.members.index', { id })
    }

    return inertia.render('organizations/members/pending_requests', {
      organization: result.organization,
      pendingRequests: result.pendingRequests,
    })
  }

  /**
   * Thêm thành viên mới vào tổ chức
   */
  async add({ params, request, response, session }: HttpContext) {
    const { id } = params
    const { email, roleId } = request.body()

    const result = await this.addMember.handle({
      organizationId: id,
      email,
      roleId: Number(roleId),
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.index', { id })
  }

  /**
   * Mời người dùng vào tổ chức
   */
  async invite({ params, request, response, session }: HttpContext) {
    const { id } = params
    const { email, roleId } = request.body()

    const result = await this.inviteUser.handle({
      organizationId: Number(id),
      email,
      roleId: Number(roleId),
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
        invitation: result.invitation,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.index', { id })
  }

  /**
   * Xử lý yêu cầu tham gia tổ chức (duyệt/từ chối)
   */
  async processRequest({ params, request, response, session }: HttpContext) {
    const { id, userId } = params
    const { action } = request.body()

    if (!['approve', 'reject'].includes(action)) {
      // Kiểm tra nếu là request AJAX/JSON
      if (request.accepts(['html', 'json']) === 'json') {
        return response.status(400).json({
          success: false,
          message: 'Hành động không hợp lệ',
        })
      }
      session.flash('error', 'Hành động không hợp lệ')
      return response.redirect().toRoute('organizations.members.pending_requests', { id })
    }

    const result = await this.processJoinRequest.handle({
      organizationId: Number(id),
      userId: Number(userId),
      action: action as 'approve' | 'reject',
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.pending_requests', { id })
  }

  /**
   * Thêm người dùng trực tiếp vào tổ chức (cho admin)
   */
  async addDirect({ params, request, response, session }: HttpContext) {
    const { id } = params
    const { userId, roleId } = request.body()

    const result = await this.addUserToOrganization.handle({
      organizationId: Number(id),
      userId: Number(userId),
      roleId: Number(roleId),
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.index', { id })
  }

  /**
   * Xóa thành viên khỏi tổ chức
   */
  async remove({ params, request, response, session }: HttpContext) {
    const { id, userId } = params

    const result = await this.removeMember.handle({
      organizationId: id,
      memberId: Number(userId),
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.index', { id })
  }

  /**
   * Cập nhật vai trò của thành viên trong tổ chức
   */
  async updateRole({ params, request, response, session }: HttpContext) {
    const { id, userId } = params
    const { roleId } = request.body()

    const result = await this.updateMemberRole.handle({
      organizationId: id,
      memberId: Number(userId),
      roleId: Number(roleId),
    })

    // Kiểm tra nếu là request AJAX/JSON
    if (request.accepts(['html', 'json']) === 'json') {
      return response.json({
        success: result.success,
        message: result.message,
      })
    }

    if (result.success) {
      session.flash('success', result.message)
    } else {
      session.flash('error', result.message)
    }

    return response.redirect().toRoute('organizations.members.index', { id })
  }

  @inject()
  async addUsers({ request, response, auth, session }: HttpContext) {
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
      // Bắt đầu một transaction
      const trx = await db.transaction()
      // Vai trò mặc định là 3 (User)
      const defaultRoleId = 3
      // Thêm từng người dùng vào tổ chức với role mặc định
      const results = []

      for (const userId of userIds) {
        // Kiểm tra xem người dùng đã tồn tại trong tổ chức chưa
        const existingMember = await OrganizationUser.query({ client: trx })
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

        // Thêm người dùng vào tổ chức
        await OrganizationUser.create(
          {
            user_id: userId,
            organization_id: organizationId,
            role_id: defaultRoleId,
            status: 'approved',
            invited_by: user.id,
          },
          { client: trx }
        )

        results.push({
          user_id: userId,
          status: 'added',
          message: 'Thêm thành công',
        })
      }
      // Commit transaction
      await trx.commit()
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
      console.error('Lỗi khi thêm người dùng vào tổ chức:', error)
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
