import { BaseCommand } from '../../base_command.js'
import type { ChangeUserRoleDTO } from '../../dtos/request/change_user_role_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { canChangeUserRole } from '#modules/users/domain/user-lifecycle/user_management_rules'

/**
 * ChangeUserRoleCommand (v3)
 *
 * Changes a user's system role.
 * v3: system_role is inline VARCHAR on users table.
 * newRoleId in DTO is now a role name string (e.g. 'superadmin', 'system_admin').
 *
 * Business Rules:
 * - Only superadmin can change roles
 * - Cannot change own role
 * - Target user must exist and not be deleted
 */
export default class ChangeUserRoleCommand extends BaseCommand<ChangeUserRoleDTO> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly events: UserApplicationEventPublisher
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: ChangeUserRoleDTO): Promise<void> {
    await this.executeInTransaction(async (trx) => {
      // Verify permissions via pure rule
      const isSuperadmin = await this.users.isSuperadmin(dto.changerId, trx)
      enforcePolicy(
        canChangeUserRole({
          actorId: dto.changerId,
          targetUserId: dto.targetUserId,
          isActorSuperadmin: isSuperadmin,
          newRole: dto.newRoleId,
        })
      )

      // Verify target user exists and not deleted
      const targetUser = await this.users.findNotDeletedOrFail(dto.targetUserId, trx)

      // Get old role for audit log
      const oldRole = targetUser.system_role

      // v3: Update inline system_role string
      await this.users.update(dto.targetUserId, { system_role: dto.newRoleId }, trx)

      // Log the action
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'change_user_role',
            critical: true,
            entity_type: 'user',
            entity_id: dto.targetUserId,
            old_values: { system_role: oldRole },
            new_values: { system_role: dto.newRoleId },
          },
          trx
        )
      }
    })

    // Invalidate permission cache
    await this.settlePostCommitEffect(
      'user.role.cache_invalidation',
      () => this.events.invalidateUserPermissionCache(dto.targetUserId),
      {
        userId: dto.targetUserId,
        actorId: dto.changerId,
      }
    )
  }
}
