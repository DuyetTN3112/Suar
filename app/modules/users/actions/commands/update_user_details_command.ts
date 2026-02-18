import type { UpdateUserDetailsDTO } from '../dtos/request/update_user_details_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import { serializeUserLifecycleTimestamp } from '#modules/users/actions/mappers/user_lifecycle_timestamp_mapper'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * UpdateUserDetailsCommand
 *
 * Command for updating user profile details.
 * v3: All detail fields are now directly on the users table.
 *
 * Business Rules:
 * - User can only update their own details
 * - Uses transaction for data consistency
 * - Logs audit trail for tracking changes
 */
export default class UpdateUserDetailsCommand extends BaseCommand<
  UpdateUserDetailsDTO,
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

  /**
   * Execute the command to update user details
   */
  async handle(dto: UpdateUserDetailsDTO): Promise<UserRecord> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }
    const lifecycleMutationId = this.runtime.createId()

    const result = await this.executeInTransaction(async (trx) => {
      const userRecord = await this.users.findNotDeletedOrFail(userId, trx)

      const requestedValues = {
        avatar_url: dto.avatar_url,
        bio: dto.bio,
        phone: dto.phone,
        address: dto.address,
        timezone: dto.timezone,
        language: dto.language,
        is_external_contributor: dto.is_external_contributor,
      }
      const updates = Object.fromEntries(
        Object.entries(requestedValues).filter(
          ([field, value]) =>
            value !== undefined && value !== userRecord[field as keyof typeof requestedValues]
        )
      ) as Partial<typeof requestedValues>

      if (Object.keys(updates).length === 0) {
        return {
          userRecord,
        }
      }

      const updatedUserRecord = await this.users.update(userId, updates, trx)
      const privateFields = new Set(['address', 'avatar_url', 'bio', 'phone'])
      const oldValues = Object.fromEntries(
        Object.keys(updates).map((field) => {
          const oldValue = userRecord[field as keyof typeof requestedValues]
          return [
            field,
            privateFields.has(field) && oldValue !== null ? '[REDACTED:OLD]' : oldValue,
          ]
        })
      )
      const newValues = Object.fromEntries(
        Object.entries(updates).map(([field, value]) => [
          field,
          privateFields.has(field) && value !== null ? '[REDACTED:NEW]' : value,
        ])
      )

      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId ?? userId,
          action: 'update',
          event_name: 'user.profile.details_updated',
          event_family: 'user.profile',
          module: 'users',
          outcome: 'success',
          entity_type: 'user',
          entity_id: userId,
          target_type: 'user',
          target_id: userId,
          old_values: oldValues,
          new_values: newValues,
          retention_class: 'user_security_2y',
          critical: true,
        },
        trx
      )
      await this.lifecycleEvents.stageProfileChanged(trx, {
        mutationId: lifecycleMutationId,
        userId,
        actorId: this.execCtx.userId ?? userId,
        changedFields: Object.keys(updates),
        occurredAt: serializeUserLifecycleTimestamp(
          updatedUserRecord.updated_at,
          'updated_at'
        ),
      })

      return {
        userRecord: updatedUserRecord,
      }
    })

    return result.userRecord
  }
}
