import type { AdminActionContext } from '#modules/admin/users/actions/action_context'
import { BaseCommand } from '#modules/admin/users/actions/commands/users/base_command'
import type { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/users/admin_transaction_runner'
import type {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import { decideSystemRoleChange } from '#modules/admin/users/domain/users/user_administration_policy'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'

export interface UpdateUserSystemRoleDTO {
  userId: string
  systemRole: 'superadmin' | 'system_admin' | 'registered_user'
}

export default class UpdateUserSystemRoleCommand extends BaseCommand<UpdateUserSystemRoleDTO> {
  constructor(
    execCtx: AdminActionContext,
    private readonly userDirectory: AdminUserDirectory,
    private readonly userLifecycle: AdminUserLifecycleWriter,
    private readonly transactions: AdminTransactionRunner
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateUserSystemRoleDTO): Promise<void> {
    // Fetch target user from repository
    const user = await this.userDirectory.findById(dto.userId)
    if (!user) {
      throw NotFoundException.user(dto.userId)
    }

    // Fetch current admin (executor) from repository
    const currentUserId = this.getCurrentUserId()
    const currentUser = await this.userDirectory.findById(currentUserId)
    if (!currentUser) {
      throw new UnauthorizedException('Current user not found')
    }

    const decision = decideSystemRoleChange({
      actorId: currentUserId,
      actorSystemRole: currentUser.systemRole,
      targetUserId: dto.userId,
      requestedSystemRole: dto.systemRole,
    })
    if (!decision.allowed) {
      throw new ForbiddenException(
        decision.reason === 'self_role_change_forbidden'
          ? 'Cannot change your own role'
          : 'Only superadmin can create other superadmins'
      )
    }

    await this.transactions.run(async (trx) => {
      await this.userLifecycle.updateSystemRole(dto.userId, dto.systemRole, trx)
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: currentUserId,
          action: 'change_user_role',
          event_name: 'user.system_role.changed',
          event_family: 'access',
          module: 'admin',
          outcome: 'success',
          entity_type: 'user',
          entity_id: dto.userId,
          target_type: 'user',
          target_id: dto.userId,
          old_values: { role: user.systemRole },
          new_values: { role: dto.systemRole },
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )
    })
  }
}
