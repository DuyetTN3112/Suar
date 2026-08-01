import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export default class DeleteUserCommand extends BaseCommand<
  { id: string },
  { success: true; message: string }
> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly runtime: UserRuntime,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super(execCtx, transactions)
  }

  async handle({ id }: { id: string }): Promise<{ success: true; message: string }> {
    const currentUserId = this.execCtx.userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    // Kiểm tra không thể xóa chính mình
    if (currentUserId === id) {
      throw new ForbiddenException('Bạn không thể xóa tài khoản của chính mình')
    }
    const lifecycleMutationId = this.runtime.createId()

    return this.executeInTransaction(async (trx) => {
      // Verify current user is superadmin
      const isSuperadmin = await this.users.isSuperadmin(currentUserId, trx)
      if (!isSuperadmin) {
        throw ForbiddenException.onlySuperAdmin('xóa người dùng')
      }

      // Verify target user exists and is not deleted
      const targetUser = await this.users.findById(id, trx)
      if (!targetUser || targetUser.deleted_at) {
        throw new NotFoundException('Người dùng không tồn tại hoặc đã bị xóa')
      }

      const deletedUser = await this.users.softDelete(id, trx)

      // Ghi log hành động
      await auditPublicApi.log(
        {
          user_id: currentUserId,
          action: AuditAction.DELETE,
          entity_type: EntityType.USER,
          entity_id: id,
        },
        this.execCtx,
        { trx, critical: true }
      )
      await this.lifecycleEvents.stageAccountLifecycle(trx, {
        mutationId: lifecycleMutationId,
        action: 'deleted',
        userId: id,
        actorId: currentUserId,
        occurredAt: serializeUserLifecycleTimestamp(
          deletedUser.deleted_at,
          'deleted_at'
        ),
      })

      return {
        success: true as const,
        message: 'Người dùng đã được xóa thành công',
      }
    })
  }
}
