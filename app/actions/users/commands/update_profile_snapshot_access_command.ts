import { randomBytes } from 'node:crypto'
import { BaseCommand } from '#actions/shared/base_command'
import UserRepository from '#infra/users/repositories/user_repository'
import UserProfileSnapshotRepository from '#infra/users/repositories/user_profile_snapshot_repository'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'
import CacheService from '#infra/cache/cache_service'

export interface UpdateProfileSnapshotAccessDTO {
  snapshotId: DatabaseId
  isPublic: boolean
  expiresInDays?: number | null
}

export interface UpdateProfileSnapshotAccessResult {
  snapshotId: DatabaseId
  isPublic: boolean
  shareableSlug: string | null
  shareableToken: string | null
  expiresAt: string | null
}

export default class UpdateProfileSnapshotAccessCommand extends BaseCommand<
  UpdateProfileSnapshotAccessDTO,
  UpdateProfileSnapshotAccessResult
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

      const exists = await UserProfileSnapshotRepository.slugExists(candidate, excludedSnapshotId)

      if (!exists) {
        return candidate
      }
    }

    return `${base}-v${version}-${Date.now().toString(36)}`
  }

  async handle(dto: UpdateProfileSnapshotAccessDTO): Promise<UpdateProfileSnapshotAccessResult> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const snapshot = await UserProfileSnapshotRepository.findOwnedById(
        dto.snapshotId,
        userId,
        trx
      )

      if (!snapshot) {
        throw new NotFoundException('Profile snapshot not found')
      }

      const previousSlug = snapshot.shareable_slug

      if (dto.isPublic) {
        if (!snapshot.shareable_slug) {
          const user = await UserRepository.findNotDeletedOrFail(userId, trx)
          snapshot.shareable_slug = await this.buildUniqueSlug(
            userId,
            user.username,
            snapshot.version,
            snapshot.id
          )
        }

        if (!snapshot.shareable_token) {
          snapshot.shareable_token = randomBytes(16).toString('hex')
        }
      } else {
        snapshot.shareable_slug = null
        snapshot.shareable_token = null
      }

      snapshot.is_public = dto.isPublic

      await UserProfileSnapshotRepository.save(snapshot, trx)

      await this.logAudit(
        'update_profile_snapshot_access',
        'user_profile_snapshot',
        snapshot.id,
        null,
        {
          is_public: snapshot.is_public,
          has_shareable_slug: !!snapshot.shareable_slug,
          expires_at: null,
        }
      )

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
        isPublic: snapshot.is_public,
        shareableSlug: snapshot.shareable_slug,
        shareableToken: snapshot.shareable_token,
        expiresAt: null,
      }
    })
  }
}
