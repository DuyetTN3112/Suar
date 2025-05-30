import { inject } from '@adonisjs/core'
import { BaseCommand } from '../../shared/base_command.js'
import type { ApproveUserDTO } from '../dtos/index.js'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * ApproveUserCommand
 *
 * Approves a pending user in an organization.
 * Changes user status from 'pending' to 'approved' in organization_users table.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * Business Rules:
 * - Only superadmin (role_id = 1) can approve users
 * - User must be in 'pending' status
 * - Audit log is created
 */
@inject()
export default class ApproveUserCommand extends BaseCommand<ApproveUserDTO> {
  /**
   * Main handler - approves a user in organization
   */
  async handle(dto: ApproveUserDTO): Promise<void> {
    // 1. Verify superadmin permission
    await this.verifySuperAdminPermission(dto.organizationId, dto.approverId)

    // 2. Update user status to approved
    await this.approveUserInOrganization(dto)

    // 3. Log the approval    // Ghi log hành động
    await this.logAudit('approve', 'user', dto.userId, undefined, {
      organization_id: dto.organizationId,
      approved_by: dto.approverId,
    })
  }

  /**
   * Verify that approver is superadmin in the organization
   */
  private async verifySuperAdminPermission(
    organizationId: number,
    approverId: number
  ): Promise<void> {
    const result = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', approverId)
      .where('role_id', 1) // role_id = 1 is superadmin
      .where('status', 'approved')
      .select('user_id')

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Chỉ superadmin mới có thể phê duyệt người dùng')
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
      .where('status', 'pending')
      .update({
        status: 'approved',
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
