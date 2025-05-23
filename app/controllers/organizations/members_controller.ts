import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RemoveMember from '#actions/organizations/remove_member'
import UpdateMemberRole from '#actions/organizations/update_member_role'
import ManageMembers from '#actions/organizations/manage_members'
import GetOrganization from '#actions/organizations/get_organization'

export default class MembersController {
  @inject()
  async editPermissions(ctx: HttpContext) {
    const { params, inertia, auth, session } = ctx
    const userId = Number(params.id)
    const organizationId = auth.user?.current_organization_id || 0
    if (!organizationId) {
      session.flash('error', 'Không tìm thấy tổ chức hiện tại')
      return inertia.location('/organizations')
    }
    // Khởi tạo action thủ công, truyền toàn bộ HttpContext
    const getOrgAction = new GetOrganization(ctx)
    const result = await getOrgAction.handle({ id: organizationId })
    if (!result.success || !result.organization) {
      session.flash('error', result.message || 'Không thể tải thông tin tổ chức')
      return inertia.location('/users')
    }
    return inertia.render('organizations/edit_member_permissions', {
      organization: result.organization,
      userId,
      userRole: result.userRole,
    })
  }
  @inject()
  async updatePermissions(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx
    const userId = Number(params.id)
    const organizationId = auth.user?.current_organization_id || 0
    // Xử lý input roleId cẩn thận hơn
    const roleIdInput = request.input('role_id')
    console.log('=== Update Member Role Debug ===')
    console.log('UserId:', userId)
    console.log('OrgId:', organizationId)
    console.log('Raw RoleId input:', roleIdInput)
    console.log('RoleId input type:', typeof roleIdInput)
    // Đảm bảo roleId luôn là số nguyên
    const roleId = Number.parseInt(roleIdInput || '0')
    console.log('Parsed RoleId:', roleId)
    console.log('Headers:', request.headers())
    console.log('Body:', request.body())
    console.log('Method:', request.method())
    console.log('Is Ajax:', request.header('X-Requested-With') === 'XMLHttpRequest')
    console.log('Is JSON:', request.accepts(['html', 'json']) === 'json')
    console.log('Is Inertia:', !!request.header('X-Inertia'))
    if (!organizationId) {
      console.error('No organization found')
      return response.status(400).json({
        success: false,
        message: 'Không tìm thấy tổ chức hiện tại',
      })
    }
    if (!roleId || Number.isNaN(roleId)) {
      console.error('Invalid role ID:', roleId, 'from input:', roleIdInput)
      return response.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ',
        debug: {
          input: roleIdInput,
          parsed: roleId,
          isValid: !!roleId && !Number.isNaN(roleId),
        },
      })
    }
    // Kiểm tra xem roleId có nằm trong phạm vi cho phép không
    if (![1, 2, 3].includes(roleId)) {
      console.error('Role ID out of allowed range:', roleId)
      return response.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ. Chỉ chấp nhận vai trò 1-3.',
      })
    }
    try {
      // Khởi tạo action thủ công, truyền toàn bộ HttpContext
      const updateRoleAction = new UpdateMemberRole(ctx)
      const result = await updateRoleAction.handle({
        organizationId,
        memberId: userId,
        roleId,
      })
      console.log('Update result:', result)
      // Xử lý response tùy vào loại request
      if (request.header('X-Inertia') || request.header('X-Requested-With') === 'XMLHttpRequest') {
        // Inertia/Ajax request - trả về JSON
        return response.status(result.success ? 200 : 400).json({
          success: result.success,
          message: result.message,
          debug: result.debug,
        })
      }
      // Response cho form post thông thường
      session.flash(result.success ? 'success' : 'error', result.message)
      return response.redirect().toRoute('users.index')
    } catch (error) {
      console.error('Exception in updatePermissions:', error)
      // Xử lý lỗi và trả về phản hồi phù hợp
      if (request.header('X-Inertia') || request.header('X-Requested-With') === 'XMLHttpRequest') {
        return response.status(500).json({
          success: false,
          message: 'Đã xảy ra lỗi khi cập nhật quyền',
          error: error.message,
        })
      }
      session.flash('error', 'Đã xảy ra lỗi khi cập nhật quyền')
      return response.redirect().toRoute('users.index')
    }
  }
  @inject()
  async removeMember(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx
    const userId = Number(params.id)
    const organizationId = auth.user?.current_organization_id || 0
    if (!organizationId) {
      session.flash('error', 'Không tìm thấy tổ chức hiện tại')
      return response.redirect().back()
    }
    // Khởi tạo action thủ công, truyền toàn bộ HttpContext
    const removeMemberAction = new RemoveMember(ctx)
    const result = await removeMemberAction.handle({
      organizationId,
      memberId: userId,
    })
    // Xử lý API request nếu là fetch/Ajax
    if (
      request.header('X-Requested-With') === 'XMLHttpRequest' ||
      request.accepts(['html', 'json']) === 'json'
    ) {
      return response.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message,
      })
    }
    // Xử lý form submit thông thường
    session.flash(result.success ? 'success' : 'error', result.message)
    return response.redirect().toRoute('users.index')
  }
}
