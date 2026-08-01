import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UpdateProfileDiscoverabilityDTO } from '#modules/users/actions/dtos/request/update_profile_discoverability_dto'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { withProfileDiscoverability } from '#modules/users/domain/profile_discoverability_policy'
import type { UserRecord } from '#modules/users/types/user_records'

export default class UpdateProfileDiscoverabilityCommand extends BaseCommand<
  UpdateProfileDiscoverabilityDTO,
  UserRecord
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

  async handle(dto: UpdateProfileDiscoverabilityDTO): Promise<UserRecord> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }

    const lifecycleMutationId = this.runtime.createId()
    const result = await this.executeInTransaction(async (trx) => {
      const user = await this.users.findNotDeletedOrFail(userId, trx)
      const profileSettings = withProfileDiscoverability(user.profile_settings, dto.isSearchable)

      if (user.profile_settings?.is_searchable === dto.isSearchable) {
        return { user }
      }

      const updatedUser = await this.users.update(
        userId,
        { profile_settings: profileSettings },
        trx
      )
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: userId,
          action: 'update',
          event_name: 'user.profile.discoverability_updated',
          event_family: 'user.profile',
          module: 'users',
          outcome: 'success',
          entity_type: 'user',
          entity_id: userId,
          target_type: 'user',
          target_id: userId,
          old_values: { is_searchable: user.profile_settings?.is_searchable ?? false },
          new_values: { is_searchable: dto.isSearchable },
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )
      await this.lifecycleEvents.stageProfileChanged(trx, {
        mutationId: lifecycleMutationId,
        userId,
        actorId: userId,
        changedFields: ['profile_settings.is_searchable'],
        occurredAt: serializeUserLifecycleTimestamp(updatedUser.updated_at, 'updated_at'),
      })

      return { user: updatedUser }
    })

    return result.user
  }
}
