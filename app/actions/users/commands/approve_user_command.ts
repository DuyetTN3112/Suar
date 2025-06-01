import { BaseCommand } from '../../shared/base_command.js'
import type { ApproveUserDTO } from '../dtos/approve_user_dto.js'
import OrganizationUser from '#models/organization_user'
import type { DatabaseId } from '#types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import PermissionService from '#services/permission_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * ApproveUserCommand
 *
 * Approves a pending user in an organization.
 * Changes user status from 'pending' to 'approved' in organization_users table.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * Business Rules:
 * - Org owner or org admin (has 'can_approve_members' permission) can approve users
 * - System superadmin can approve users
 * - User must be in 'pending' status
 * - Audit log is created
 */
export default class ApproveUserCommand extends BaseCommand<ApproveUserDTO> {
  /**
   * Main handler - approves a user in organization
   */
  async handle(dto: ApproveUserDTO): Promise<void> {
    // 1. Verify permission: org owner/admin with can_approve_members, or system superadmin
    await this.verifyApprovePermission(dto.organizationId, dto.approverId)

    // 2. Update user status to approved
    await this.approveUserInOrganization(dto)

    // 3. Log the approval
    await this.logAudit('approve', 'user', dto.userId, undefined, {
      organization_id: dto.organizationId,
      approved_by: dto.approverId,
    })

    // 4. Emit domain event
    void emitter.emit('user:approved', {
      userId: dto.userId,
      approvedBy: dto.approverId,
      organizationId: dto.organizationId,
    })
  }

  /**
   * Verify that approver has permission to approve members.
   * DB gives org_owner AND org_admin the 'can_approve_members' permission.
   */
  private async verifyApprovePermission(
    organizationId: DatabaseId,
    approverId: DatabaseId
  ): Promise<void> {
    const hasPermission = await PermissionService.checkOrgPermission(
      approverId,
      organizationId,
      'can_approve_members'
    )

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền phê duyệt thành viên trong tổ chức này')
    }
  }

  /**
   * Update user status from pending to approved → delegate to Model
   */
  private async approveUserInOrganization(dto: ApproveUserDTO): Promise<void> {
    const membership = await OrganizationUser.findMembership(dto.userId, dto.organizationId)

    if (!membership || membership.status !== OrganizationUserStatus.PENDING) {
      throw new NotFoundException(
        'Không tìm thấy yêu cầu phê duyệt người dùng này hoặc người dùng đã được phê duyệt'
      )
    }

    await OrganizationUser.updateStatus(
      dto.userId,
      dto.organizationId,
      OrganizationUserStatus.APPROVED
    )
  }
}
