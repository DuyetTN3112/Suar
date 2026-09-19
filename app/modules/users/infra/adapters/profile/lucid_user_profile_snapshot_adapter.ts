import type { DateTime } from 'luxon'

import type {
  PersistedUserProfileSnapshot,
} from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import { toLucidUserTransaction } from '#modules/users/infra/adapters/profile/lucid_user_transaction_runner'
import UserProfileSnapshot from '#modules/users/infra/models/profile/user_profile_snapshot'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import * as profileSnapshotMutations from '#modules/users/infra/repositories/write/user_profile_snapshot_mutations'
import type { DateTimeLike } from '#modules/users/types/user_records'

export function toProfileSnapshotRecord(
  snapshot: UserProfileSnapshot
): PersistedUserProfileSnapshot {
  return {
    id: snapshot.id,
    user_id: snapshot.user_id,
    version: snapshot.version,
    snapshot_name: snapshot.snapshot_name,
    is_current: snapshot.is_current,
    is_public: snapshot.is_public,
    shareable_slug: snapshot.shareable_slug,
    shareable_token: snapshot.shareable_token,
    summary: snapshot.summary,
    skills_verified: snapshot.skills_verified,
    work_highlights: snapshot.work_highlights,
    performance_metrics: snapshot.performance_metrics,
    trust_metrics: snapshot.trust_metrics,
    scoring_version: snapshot.scoring_version,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
  }
}

export class LucidUserProfileSnapshotAdapter {
  async findCurrentSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findCurrentByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async listSnapshots(
    userId: string,
    limit: number,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot[]> {
    const snapshots = await profileSnapshotQueries.listByUser(
      userId,
      limit,
      toLucidUserTransaction(transaction)
    )
    return snapshots.map((snapshot) => toProfileSnapshotRecord(snapshot))
  }

  async findPublicSnapshot(
    slug: string,
    token: string | null,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findPublicBySlugOrToken(
      slug,
      token,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async findOwnedSnapshot(
    snapshotId: string,
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findOwnedById(
      snapshotId,
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  async findLatestSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot | null> {
    const snapshot = await profileSnapshotQueries.findLatestByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
    return snapshot ? toProfileSnapshotRecord(snapshot) : null
  }

  countSnapshotsSince(
    userId: string,
    since: DateTimeLike,
    transaction?: UserTransaction
  ): Promise<number> {
    return profileSnapshotQueries.countByUserSince(
      userId,
      since as DateTime,
      toLucidUserTransaction(transaction)
    )
  }

  snapshotSlugExists(
    slug: string,
    excludeSnapshotId?: string,
    transaction?: UserTransaction
  ): Promise<boolean> {
    return profileSnapshotQueries.slugExists(
      slug,
      excludeSnapshotId,
      toLucidUserTransaction(transaction)
    )
  }

  async unsetCurrentSnapshot(
    userId: string,
    transaction?: UserTransaction
  ): Promise<void> {
    await profileSnapshotMutations.unsetCurrentByUser(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  async createSnapshot(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot> {
    const snapshot = await profileSnapshotMutations.create(
      data,
      toLucidUserTransaction(transaction)
    )
    return toProfileSnapshotRecord(snapshot)
  }

  async updateSnapshot(
    snapshotId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<PersistedUserProfileSnapshot> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const model = await UserProfileSnapshot.query(
      lucidTransaction ? { client: lucidTransaction } : undefined
    )
      .where('id', snapshotId)
      .firstOrFail()
    model.merge(data)
    const snapshot = await profileSnapshotMutations.save(model, lucidTransaction)
    return toProfileSnapshotRecord(snapshot)
  }
}
