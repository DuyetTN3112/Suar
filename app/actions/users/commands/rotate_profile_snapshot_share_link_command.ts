import { randomBytes } from 'node:crypto'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as profileSnapshotQueries from '#infra/users/repositories/read/user_profile_snapshot_queries'
import * as profileSnapshotMutations from '#infra/users/repositories/write/user_profile_snapshot_mutations'
import type { DatabaseId } from '#types/database'

export interface RotateProfileSnapshotShareLinkDTO {
  snapshotId: DatabaseId
}

export interface RotateProfileSnapshotShareLinkResult {
  snapshotId: DatabaseId
  shareableSlug: string
  shareableToken: string
}

export default class RotateProfileSnapshotShareLinkCommand extends BaseCommand<
  RotateProfileSnapshotShareLinkDTO,
  RotateProfileSnapshotShareLinkResult
> {
  private async buildUniqueSlug(
    userId: DatabaseId,
    username: string | null,
    version: number,
    excludedSnapshotId: DatabaseId,
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
        void CacheService.deleteByPattern(`*profile:snapshot:current*${userId}*`)
        void CacheService.deleteByPattern(`*profile:snapshot:history*${userId}*`)

        if (previousSlug) {
          void CacheService.deleteByPattern(`*profile:snapshot:public*${previousSlug}*`)
        }

        if (snapshot.shareable_slug) {
          void CacheService.deleteByPattern(`*profile:snapshot:public*${snapshot.shareable_slug}*`)
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
