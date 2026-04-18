import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { UserInfraMapper } from '#modules/users/infra/mapper/user_infra_mapper'
import User from '#modules/users/infra/models/user'
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

export const findActiveOrFail = async (userId: string, trx?: TransactionClientContract) => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query
    .where('id', userId)
    .whereNull('deleted_at')
    .where('status', UserStatusName.ACTIVE)
    .first()

  if (!user) {
    throw new NotFoundException('User không tồn tại hoặc không active')
  }
  return user
}

export const isActive = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query
    .where('id', userId)
    .whereNull('deleted_at')
    .where('status', UserStatusName.ACTIVE)
    .select('id')
    .first()

  return user !== null
}

export const isExternalContributor = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return !!user?.is_external_contributor
}

export const isSuperadmin = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return user?.system_role === SystemRoleName.SUPERADMIN
}

export const findNotDeletedOrFail = async (userId: string, trx?: TransactionClientContract) => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.where('id', userId).whereNull('deleted_at').firstOrFail()
}

export const findNotDeletedOrFailRecord = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  const user = await findNotDeletedOrFail(userId, trx)
  return UserInfraMapper.toRecord(user)
}

export const getSystemRoleName = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<string | null> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return user?.system_role ?? null
}

export const isSystemAdmin = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const roleName = await getSystemRoleName(userId, trx)
  return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
    roleName as SystemRoleName
  )
}

export const findByIds = async (
  userIds: string[],
  selectColumns: string[] = ['id', 'username', 'email'],
  trx?: TransactionClientContract
): Promise<User[]> => {
  if (userIds.length === 0) return []
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.whereIn('id', userIds).select(selectColumns)
}

export const findIdsByUsernameLike = async (username: string): Promise<string[]> => {
  const normalizedUsername = username.trim()
  if (!normalizedUsername) return []

  const users = await User.query()
    .where('username', 'ilike', `%${normalizedUsername}%`)
    .select('id')
  return users.map((user) => user.id)
}

export const listTalentExplainabilityProjectionTargetIds = async (
  afterId: string | null,
  limit: number,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  void query.whereNull('deleted_at').select('id').orderBy('id', 'asc').limit(limit)
  if (afterId) {
    void query.where('id', '>', afterId)
  }

  const users = await query
  return users.map((user) => user.id)
}

export const findById = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<User | null> => {
  if (trx) {
    return User.query({ client: trx }).where('id', userId).first()
  }
  return User.find(userId)
}

export const findByEmail = async (
  email: string,
  trx?: TransactionClientContract
): Promise<User | null> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.where('email', email).first()
}

export const queryNotDeleted = (
  trx?: TransactionClientContract
): ModelQueryBuilderContract<typeof User, User> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.whereNull('deleted_at')
}

export const findProfile = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<User> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  void query.where('id', userId).whereNull('deleted_at')

  return query.firstOrFail()
}

export const paginateUsersList = async (
  options: {
    page: number
    limit: number
    search?: string
    roleId?: string | number | null
    statusId?: string | number | null
    excludeStatusId?: string | number | null
    includeUserIds?: string[]
    excludeUserIds?: string[]
  },
  trx?: TransactionClientContract
) => {
  let query = queryNotDeleted(trx)

  if (options.includeUserIds) {
    query = query.whereIn('id', options.includeUserIds)
  }

  if (options.excludeUserIds?.length) {
    query = query.whereNotIn('id', options.excludeUserIds)
  }

  if (options.roleId) {
    query = query.where('system_role', options.roleId)
  }

  if (options.statusId) {
    query = query.where('status', options.statusId)
  }

  if (options.excludeStatusId) {
    query = query.whereNot('status', options.excludeStatusId)
  }

  if (options.search) {
    const searchTerm = options.search
    query = query.where((searchQuery) => {
      void searchQuery
        .where('email', 'LIKE', `%${searchTerm}%`)
        .orWhere('username', 'LIKE', `%${searchTerm}%`)
    })
  }

  return query.paginate(options.page, options.limit)
}
