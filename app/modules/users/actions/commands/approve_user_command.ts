import { BaseCommand } from '../base_command.js'
import type { ApproveUserDTO } from '../dtos/request/approve_user_dto.js'
import type {
  UserOrganizationMembershipReaderWriter,
  UserPermissionReader,
} from '../ports/outbound/user_external_dependencies.js'
import type { UserTransactionRunner } from '../ports/outbound/user_transaction.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { UserEventPublisher } from '#modules/users/actions/ports/outbound/user_event_publisher'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
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
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly permissionReader: UserPermissionReader,
    private readonly userEventPublisher: UserEventPublisher
  ) {
    super(execCtx, transactions)
  }

  /**
   * Main handler - approves a user in organization
   */
  async handle(dto: ApproveUserDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
      // 1-2. Verify permission and status via pure rule
      const hasPermission = await this.permissionReader.checkOrgPermission(
        dto.approverId,
        dto.organizationId,
        'can_approve_members',
        trx
      )
      const membership = await this.organizationMembership.findMembershipStatus(
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
      await this.organizationMembership.approveMembership(
        dto.userId,
        dto.organizationId,
        trx
      )

      // 4. Log the approval
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'approve',
            critical: true,
            entity_type: 'user',
            entity_id: dto.userId,
            old_values: undefined,
            new_values: {
              organization_id: dto.organizationId,
              approved_by: dto.approverId,
            },
          },
          trx
        )
      }

      return {
        userApprovedEvent: {
          userId: dto.userId,
          approvedBy: dto.approverId,
          organizationId: dto.organizationId,
        },
      }
    })

    await this.settlePostCommitEffect(
      'user.approved',
      () => this.userEventPublisher.publishUserApproved(result.userApprovedEvent),
      {
        userId: dto.userId,
        actorId: dto.approverId,
      }
    )
  }
}
