import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface UpdateProfileSnapshotAccessDTO {
  snapshotId: string
  isPublic: boolean
  expiresInDays?: number | null
}

export interface UpdateProfileSnapshotAccessResult {
  snapshotId: string
  isPublic: boolean
  shareableSlug: string | null
  shareableToken: string | null
  expiresAt: string | null
}

export default class UpdateProfileSnapshotAccessCommand extends BaseCommand<
  UpdateProfileSnapshotAccessDTO,
  UpdateProfileSnapshotAccessResult
> {
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly runtime: UserRuntime
  ) {
    super(context, transactions)
  }

  private async buildUniqueSlug(
    userId: string,
    username: string | null,
    version: number,
    excludedSnapshotId: string,
    maxAttempts = 6
  ): Promise<string> {
    const base = (username ?? userId).toLowerCase().replace(/[^a-z0-9]+/g, '-')

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const suffix = this.runtime.createToken(4)
      const candidate = `${base}-v${version}-${suffix}`

      const exists = await this.profiles.snapshotSlugExists(candidate, excludedSnapshotId)

      if (!exists) {
        return candidate
      }
    }

    return `${base}-v${version}-${Date.now().toString(36)}`
  }

  async handle(dto: UpdateProfileSnapshotAccessDTO): Promise<UpdateProfileSnapshotAccessResult> {
    const userId = this.getCurrentUserId()
    return this.executeInTransaction(async (trx) => {
      const snapshot = await this.profiles.findOwnedSnapshot(dto.snapshotId, userId, trx)

      if (!snapshot) {
        throw new NotFoundException('Profile snapshot not found')
      }

      if (dto.isPublic) {
        if (!snapshot.shareable_slug) {
          const user = await this.users.findNotDeletedOrFail(userId, trx)
          snapshot.shareable_slug = await this.buildUniqueSlug(
            userId,
            user.username,
            snapshot.version,
            snapshot.id
          )
        }

        snapshot.shareable_token ??= this.runtime.createToken(16)
      } else {
        snapshot.shareable_slug = null
        snapshot.shareable_token = null
      }

      snapshot.is_public = dto.isPublic

      await this.profiles.updateSnapshot(
        snapshot.id,
        {
          shareable_slug: snapshot.shareable_slug,
          shareable_token: snapshot.shareable_token,
          is_public: snapshot.is_public,
        },
        trx
      )

      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'update_profile_snapshot_access',
            critical: true,
            entity_type: 'user_profile_snapshot',
            entity_id: snapshot.id,
            old_values: null,
            new_values: {
              is_public: snapshot.is_public,
              has_shareable_slug: !!snapshot.shareable_slug,
              expires_at: null,
            },
          },
          trx
        )
      }

      return {
        snapshotId: snapshot.id,
        isPublic: snapshot.is_public,
        shareableSlug: snapshot.shareable_slug,
        shareableToken: snapshot.shareable_token,
        expiresAt: null,
      }
    })
  }
}
