import type { AdminActionContext } from '#modules/admin/users/actions/action_context'
import { BaseCommand } from '#modules/admin/users/actions/commands/users/base_command'
import type { AdminMutationIdentityGenerator } from '#modules/admin/users/actions/ports/outbound/users/admin_mutation_identity_generator'
import type { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/users/admin_transaction_runner'
import type {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import { decideAccountStatusChange } from '#modules/admin/users/domain/users/user_administration_policy'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { revokeNotificationRealtimeSessions } from '#modules/notifications/public_contracts/notification_realtime_session'

export interface SuspendUserDTO {
  userId: string
  action: 'suspend' | 'activate'
}

export default class SuspendUserCommand extends BaseCommand<SuspendUserDTO> {
  constructor(
    execCtx: AdminActionContext,
    private readonly userDirectory: AdminUserDirectory,
    private readonly userLifecycle: AdminUserLifecycleWriter,
    private readonly transactions: AdminTransactionRunner,
    private readonly mutationIdentities: AdminMutationIdentityGenerator
  ) {
    super(execCtx)
  }

  async handle(dto: SuspendUserDTO): Promise<void> {
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

    const decision = decideAccountStatusChange({
      actorId: currentUserId,
      actorSystemRole: currentUser.systemRole,
      targetUserId: dto.userId,
      targetSystemRole: user.systemRole,
    })
    if (!decision.allowed) {
      throw new ForbiddenException(
        decision.reason === 'self_status_change_forbidden'
          ? 'Cannot suspend/activate your own account'
          : 'Only superadmin can suspend other superadmins'
      )
    }

    const lifecycleIdentity = this.mutationIdentities.next()
    await this.transactions.run(async (trx) => {
      await this.userLifecycle.updateStatus(
        dto.userId,
        dto.action === 'suspend' ? 'suspended' : 'active',
        trx
      )

      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: currentUserId,
          action: dto.action === 'suspend' ? 'suspend_user' : 'activate_user',
          event_name: 'user.account.status_changed',
          event_family: 'user.account',
          module: 'admin',
          outcome: 'success',
          entity_type: 'user',
          entity_id: dto.userId,
          target_type: 'user',
          target_id: dto.userId,
          old_values: { status: user.status },
          new_values: {
            status: dto.action === 'suspend' ? 'suspended' : 'active',
          },
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )
      await this.userLifecycle.stageAccountLifecycle({
        mutationId: lifecycleIdentity.mutationId,
        action: dto.action === 'suspend' ? 'suspended' : 'activated',
        userId: dto.userId,
        actorId: currentUserId,
        occurredAt: lifecycleIdentity.occurredAt,
      }, trx)
    })
    if (dto.action === 'suspend') {
      await revokeNotificationRealtimeSessions(dto.userId)
    }
  }
}
