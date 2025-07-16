import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../../shared/base_command.js'
import type { ApproveUserDTO } from '../dtos/request/approve_user_dto.js'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { canApproveUser } from '#domain/users/user_management_rules'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

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
    // 1-2. Verify permission and status via pure rule
    const hasPermission = await DefaultUserDependencies.permission.checkOrgPermission(
      dto.approverId,
      dto.organizationId,
      'can_approve_members'
    )
    const membership = await DefaultUserDependencies.organizationMembership.findMembershipStatus(
      dto.userId,
      dto.organizationId
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
      dto.organizationId
    )

    // 4. Log the approval
    await this.logAudit('approve', 'user', dto.userId, undefined, {
      organization_id: dto.organizationId,
      approved_by: dto.approverId,
    })

    // 5. Emit domain event
    void emitter.emit('user:approved', {
      userId: dto.userId,
      approvedBy: dto.approverId,
      organizationId: dto.organizationId,
    })
  }
}
