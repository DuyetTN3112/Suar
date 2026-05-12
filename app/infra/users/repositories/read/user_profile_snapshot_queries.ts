import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserProfileSnapshot from '#infra/users/models/user_profile_snapshot'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserProfileSnapshot.query({ client: trx }) : UserProfileSnapshot.query()
}

export const findCurrentByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx)
    .where('user_id', userId)
    .where('is_current', true)
    .orderBy('version', 'desc')
    .first()
}

export const listByUser = async (
  userId: DatabaseId,
  limit: number,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot[]> => {
  return baseQuery(trx).where('user_id', userId).orderBy('version', 'desc').limit(limit)
}

export const findPublicBySlugOrToken = async (
  slug: string,
  token?: string | null,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx)
    .where('shareable_slug', slug)
    .where((query) => {
      void query.where('is_public', true)
      if (token) {
        void query.orWhere('shareable_token', token)
      }
    })
    .first()
}

export const slugExists = async (
  slug: string,
  excludeSnapshotId?: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = baseQuery(trx).where('shareable_slug', slug)

  if (excludeSnapshotId) {
    void query.whereNot('id', excludeSnapshotId)
  }

  return (await query.first()) !== null
}

export const findOwnedById = async (
  snapshotId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx).where('id', snapshotId).where('user_id', userId).first()
}

export const findLatestByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx).where('user_id', userId).orderBy('version', 'desc').first()
}
