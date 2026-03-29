import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import UserProfileSnapshot from '#models/user_profile_snapshot'

export default class UserProfileSnapshotRepository {
  private readonly __instanceMarker = true

  static {
    void new UserProfileSnapshotRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserProfileSnapshot.query({ client: trx }) : UserProfileSnapshot.query()
  }

  static async findCurrentByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot | null> {
    return this.baseQuery(trx)
      .where('user_id', userId)
      .where('is_current', true)
      .orderBy('version', 'desc')
      .first()
  }

  static async listByUser(
    userId: DatabaseId,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot[]> {
    return this.baseQuery(trx).where('user_id', userId).orderBy('version', 'desc').limit(limit)
  }

  static async findPublicBySlugOrToken(
    slug: string,
    token?: string | null,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot | null> {
    return this.baseQuery(trx)
      .where('shareable_slug', slug)
      .where((query) => {
        void query.where('is_public', true)
        if (token) {
          void query.orWhere('shareable_token', token)
        }
      })
      .first()
  }

  static async slugExists(
    slug: string,
    excludeSnapshotId?: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = this.baseQuery(trx).where('shareable_slug', slug)

    if (excludeSnapshotId) {
      void query.whereNot('id', excludeSnapshotId)
    }

    return (await query.first()) !== null
  }

  static async findOwnedById(
    snapshotId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot | null> {
    return this.baseQuery(trx).where('id', snapshotId).where('user_id', userId).first()
  }

  static async findLatestByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot | null> {
    return this.baseQuery(trx).where('user_id', userId).orderBy('version', 'desc').first()
  }

  static async unsetCurrentByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await this.baseQuery(trx).where('user_id', userId).where('is_current', true).update({
      is_current: false,
    })
  }

  static async create(
    data: Partial<UserProfileSnapshot>,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot> {
    return UserProfileSnapshot.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    snapshot: UserProfileSnapshot,
    trx?: TransactionClientContract
  ): Promise<UserProfileSnapshot> {
    if (trx) {
      snapshot.useTransaction(trx)
    }
    await snapshot.save()
    return snapshot
  }
}
