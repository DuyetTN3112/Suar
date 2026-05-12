import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserProfileSnapshot from '#infra/users/models/user_profile_snapshot'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserProfileSnapshot.query({ client: trx }) : UserProfileSnapshot.query()
}

export const unsetCurrentByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx).where('user_id', userId).where('is_current', true).update({
    is_current: false,
  })
}

export const create = async (
  data: Partial<UserProfileSnapshot>,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot> => {
  return UserProfileSnapshot.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  snapshot: UserProfileSnapshot,
  trx?: TransactionClientContract
): Promise<UserProfileSnapshot> => {
  if (trx) {
    snapshot.useTransaction(trx)
  }
  await snapshot.save()
  return snapshot
}
