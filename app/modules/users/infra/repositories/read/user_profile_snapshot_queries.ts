import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { type DateTime } from 'luxon'

import UserProfileSnapshot from '#modules/users/infra/models/user_profile_snapshot'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserProfileSnapshot.query({ client: trx }) : UserProfileSnapshot.query()
}

export const findCurrentByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx)
    .where('user_id', userId)
    .where('is_current', true)
    .orderBy('version', 'desc')
    .first()
}

export const listByUser = async (
  userId: string,
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
  excludeSnapshotId?: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = baseQuery(trx).where('shareable_slug', slug)

  if (excludeSnapshotId) {
    void query.whereNot('id', excludeSnapshotId)
  }

  return (await query.first()) !== null
}

export const findOwnedById = async (
  snapshotId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx).where('id', snapshotId).where('user_id', userId).first()
}

export const findLatestByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot | null> => {
  return baseQuery(trx).where('user_id', userId).orderBy('version', 'desc').first()
}

export const countByUserSince = async (
  userId: string,
  since: DateTime,
  trx?: TransactionClientContract
): Promise<number> => {
  const result = await baseQuery(trx)
    .where('user_id', userId)
    .where('created_at', '>=', since.toSQL() ?? new Date().toISOString())
    .count('* as total')
    .first()
  if (!result) {
    return 0
  }
  return Number(result.$extras.total ?? 0)
}
