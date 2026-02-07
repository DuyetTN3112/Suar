import { BaseCommand } from '../../shared/base_command.js'
import type { ApproveUserDTO } from '../dtos/approve_user_dto.js'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { OrganizationUserStatus } from '#constants/organization_constants'
import PermissionService from '#services/permission_service'

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
  }

  /**
   * Verify that approver has permission to approve members.
   * DB gives org_owner AND org_admin the 'can_approve_members' permission.
   */
  private async verifyApprovePermission(organizationId: number, approverId: number): Promise<void> {
    const hasPermission = await PermissionService.checkOrgPermission(
      approverId,
      organizationId,
      'can_approve_members'
    )

    if (!hasPermission) {
      throw new Error('Bạn không có quyền phê duyệt thành viên trong tổ chức này')
    }
  }

  /**
   * Update user status from pending to approved
   */
  private async approveUserInOrganization(dto: ApproveUserDTO): Promise<void> {
    const updateResult = await db
      .from('organization_users')
      .where('organization_id', dto.organizationId)
      .where('user_id', dto.userId)
      .where('status', OrganizationUserStatus.PENDING)
      .update({
        status: OrganizationUserStatus.APPROVED,
        updated_at: DateTime.now().toSQL(),
      })

    // update() returns affected rows count (number) in MySQL or array in PostgreSQL
    const affectedRows = Array.isArray(updateResult) ? updateResult.length : Number(updateResult)
    if (affectedRows === 0) {
      throw new Error(
        'Không tìm thấy yêu cầu phê duyệt người dùng này hoặc người dùng đã được phê duyệt'
      )
    }
  }
}
