import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

export interface RotateProfileSnapshotShareLinkDTO {
  snapshotId: string
}

export interface RotateProfileSnapshotShareLinkResult {
  snapshotId: string
  shareableSlug: string
  shareableToken: string
}

export default class RotateProfileSnapshotShareLinkCommand extends BaseCommand<
  RotateProfileSnapshotShareLinkDTO,
  RotateProfileSnapshotShareLinkResult
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

  async handle(
    dto: RotateProfileSnapshotShareLinkDTO
  ): Promise<RotateProfileSnapshotShareLinkResult> {
    const userId = this.getCurrentUserId()
    return this.executeInTransaction(async (trx) => {
      const snapshot = await this.profiles.findOwnedSnapshot(dto.snapshotId, userId, trx)

      if (!snapshot) {
        throw new NotFoundException('Profile snapshot not found')
      }

      const user = await this.users.findNotDeletedOrFail(userId, trx)

      const shareableSlug = await this.buildUniqueSlug(
        userId,
        user.username,
        snapshot.version,
        snapshot.id
      )
      const shareableToken = this.runtime.createToken(16)
      await this.profiles.updateSnapshot(
        snapshot.id,
        {
          shareable_slug: shareableSlug,
          shareable_token: shareableToken,
          is_public: true,
        },
        trx
      )

      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'rotate_profile_snapshot_share_link',
            critical: true,
            entity_type: 'user_profile_snapshot',
            entity_id: snapshot.id,
            old_values: null,
            new_values: {
              shareable_slug: shareableSlug,
            },
          },
          trx
        )
      }

      return {
        snapshotId: snapshot.id,
        shareableSlug,
        shareableToken,
      }
    })
  }
}
