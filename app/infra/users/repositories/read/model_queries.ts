import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

import { SystemRoleName } from '#constants/user_constants'
import NotFoundException from '#exceptions/not_found_exception'
import { UserInfraMapper } from '#infra/users/mapper/user_infra_mapper'
import User from '#infra/users/models/user'
import type { DatabaseId } from '#types/database'
import type { UserProfileRecord, UserRecord } from '#types/user_records'

export const findActiveOrFail = async (userId: DatabaseId, trx?: TransactionClientContract) => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query
    .where('id', userId)
    .whereNull('deleted_at')
    .where('status', 'active')
    .first()

  if (!user) {
    throw new NotFoundException('User không tồn tại hoặc không active')
  }
  return user
}

export const isActive = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  try {
    await findActiveOrFail(userId, trx)
    return true
  } catch {
    return false
  }
}

export const isFreelancer = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return !!user?.is_freelancer
}

export const isSuperadmin = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return user?.system_role === SystemRoleName.SUPERADMIN
}

export const findNotDeletedOrFail = async (userId: DatabaseId, trx?: TransactionClientContract) => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.where('id', userId).whereNull('deleted_at').firstOrFail()
}

export const findNotDeletedOrFailRecord = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserRecord> => {
  const user = await findNotDeletedOrFail(userId, trx)
  return UserInfraMapper.toRecord(user)
}

export const getSystemRoleName = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<string | null> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  const user = await query.where('id', userId).whereNull('deleted_at').first()
  return user?.system_role ?? null
}

export const isSystemAdmin = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const roleName = await getSystemRoleName(userId, trx)
  return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
    roleName as SystemRoleName
  )
}

export const findByIds = async (
  userIds: DatabaseId[],
  selectColumns: string[] = ['id', 'username', 'email'],
  trx?: TransactionClientContract
): Promise<User[]> => {
  if (userIds.length === 0) return []
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.whereIn('id', userIds).select(selectColumns)
}

export const findByOrganization = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<User[]> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query
    .select(['users.id', 'users.username', 'users.email'])
    .join('organization_users', 'users.id', 'organization_users.user_id')
    .where('organization_users.organization_id', organizationId)
    .whereNull('users.deleted_at')
    .orderBy('users.username', 'asc')
}

export const findById = async (
  userId: DatabaseId,
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

export const findWithOrganizations = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<User> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.where('id', userId).preload('organizations').firstOrFail()
}

export const queryNotDeleted = (
  trx?: TransactionClientContract
): ModelQueryBuilderContract<typeof User, User> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  return query.whereNull('deleted_at')
}

export const findProfileWithRelations = async (
  userId: DatabaseId,
  options: { includeSkills?: boolean },
  trx?: TransactionClientContract
): Promise<User> => {
  const query = trx ? User.query({ client: trx }) : User.query()
  void query.where('id', userId).whereNull('deleted_at').preload('current_organization')

  if (options.includeSkills) {
    void query.preload('skills', (skillsQuery) => {
      void skillsQuery.preload('skill')
    })
  }

  return query.firstOrFail()
}

export const findProfileWithRelationsRecord = async (
  userId: DatabaseId,
  options: { includeSkills?: boolean },
  trx?: TransactionClientContract
): Promise<UserProfileRecord> => {
  const user = await findProfileWithRelations(userId, options, trx)
  return UserInfraMapper.toProfileRecord(user)
}

export const paginateUsersList = async (
  options: {
    page: number
    limit: number
    organizationId?: DatabaseId
    search?: string
    roleId?: string | number | null
    statusId?: string | number | null
    excludeStatusId?: string | number | null
    excludeOrganizationMembers?: boolean
    organizationUserStatus?: string | null
  },
  trx?: TransactionClientContract
) => {
  let query = queryNotDeleted(trx)
  const { organizationId, organizationUserStatus } = options

  if (options.excludeOrganizationMembers && organizationId) {
    query = query.whereDoesntHave('organization_users', (membershipQuery) => {
      void membershipQuery.where('organization_id', organizationId)
    })
  } else if (organizationId) {
    query = query
      .whereHas('organization_users', (membershipQuery) => {
        void membershipQuery.where('organization_id', organizationId)
        if (organizationUserStatus) {
          void membershipQuery.where('status', organizationUserStatus)
        }
      })
      .preload('organization_users', (membershipQuery) => {
        void membershipQuery.where('organization_id', organizationId)
      })
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
