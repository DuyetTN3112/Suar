import { randomBytes } from 'node:crypto'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'

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
  private async buildUniqueSlug(
    userId: string,
    username: string | null,
    version: number,
    excludedSnapshotId: string,
    maxAttempts = 6
  ): Promise<string> {
    const base = (username ?? userId).toLowerCase().replace(/[^a-z0-9]+/g, '-')

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const suffix = randomBytes(4).toString('hex')
      const candidate = `${base}-v${version}-${suffix}`

      const exists = await profileSnapshotQueries.slugExists(candidate, excludedSnapshotId)

      if (!exists) {
        return candidate
      }
    }

    return `${base}-v${version}-${Date.now().toString(36)}`
  }

  async handle(
    dto: RotateProfileSnapshotShareLinkDTO
  ): Promise<RotateProfileSnapshotShareLinkResult> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const snapshot = await profileSnapshotQueries.findOwnedById(
        dto.snapshotId,
        userId,
        trx
      )

      if (!snapshot) {
        throw new NotFoundException('Profile snapshot not found')
      }

      const previousSlug = snapshot.shareable_slug

      const user = await userModelQueries.findNotDeletedOrFail(userId, trx)

      snapshot.shareable_slug = await this.buildUniqueSlug(
        userId,
        user.username,
        snapshot.version,
        snapshot.id
      )
      snapshot.shareable_token = randomBytes(16).toString('hex')
      snapshot.is_public = true

      await profileSnapshotMutations.save(snapshot, trx)

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'rotate_profile_snapshot_share_link',
          entity_type: 'user_profile_snapshot',
          entity_id: snapshot.id,
          old_values: null,
          new_values: {
            shareable_slug: snapshot.shareable_slug,
          },
        })
      }

      void trx.on('commit', () => {
        void cacheStore.deleteByPattern(`*profile:snapshot:current*${userId}*`)
        void cacheStore.deleteByPattern(`*profile:snapshot:history*${userId}*`)

        if (previousSlug) {
          void cacheStore.deleteByPattern(`*profile:snapshot:public*${previousSlug}*`)
        }

        if (snapshot.shareable_slug) {
          void cacheStore.deleteByPattern(`*profile:snapshot:public*${snapshot.shareable_slug}*`)
        }
      })

      return {
        snapshotId: snapshot.id,
        shareableSlug: snapshot.shareable_slug,
        shareableToken: snapshot.shareable_token,
      }
    })
  }
}
