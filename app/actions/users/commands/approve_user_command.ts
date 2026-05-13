import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { ApproveUserDTO } from '../dtos/request/approve_user_dto.js'
import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { canApproveUser } from '#modules/users/domain/user_management_rules'

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
    await this.executeInTransaction(async (trx) => {
      // 1-2. Verify permission and status via pure rule
      const hasPermission = await DefaultUserDependencies.permission.checkOrgPermission(
        dto.approverId,
        dto.organizationId,
        'can_approve_members',
        trx
      )
      const membership = await DefaultUserDependencies.organizationMembership.findMembershipStatus(
        dto.userId,
        dto.organizationId,
        trx
      )

      enforcePolicy(
        canApproveUser({
          hasApprovePermission: hasPermission,
          targetMembershipStatus: membership?.status ?? null,
        })
      )

      // 3. Update user status to approved
      await DefaultUserDependencies.organizationMembership.approveMembership(
        dto.userId,
        dto.organizationId,
        trx
      )

      // 4. Log the approval
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'approve',
          entity_type: 'user',
          entity_id: dto.userId,
          old_values: undefined,
          new_values: {
            organization_id: dto.organizationId,
            approved_by: dto.approverId,
          },
        })
      }

      // 5. Emit domain event
      void emitter.emit('user:approved', {
        userId: dto.userId,
        approvedBy: dto.approverId,
        organizationId: dto.organizationId,
      })
    })
  }
}
