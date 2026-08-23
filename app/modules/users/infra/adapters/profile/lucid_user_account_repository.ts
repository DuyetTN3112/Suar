import db from '@adonisjs/lucid/services/db'

import type {
  UserAccountRepository,
  UserAdministrationListOptions,
  UserAdministrationStats,
  UserListReadOptions,
} from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import { toLucidUserTransaction } from '#modules/users/infra/adapters/profile/lucid_user_transaction_runner'
import { UserInfraMapper } from '#modules/users/infra/adapters/profile/user_infra_mapper'
import * as userModelQueries from '#modules/users/infra/repositories/read/model_queries'
import * as userMutations from '#modules/users/infra/repositories/write/user_mutations'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'
import type {
  UserCredibilityData,
  UserTalentExplainabilityProjectionV1,
} from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export class LucidUserAccountRepository implements UserAccountRepository {
  async findById(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord | null> {
    const user = await userModelQueries.findById(userId, toLucidUserTransaction(transaction))
    return user ? UserInfraMapper.toRecord(user) : null
  }

  async findByEmail(
    email: string,
    transaction?: UserTransaction
  ): Promise<UserRecord | null> {
    const user = await userModelQueries.findByEmail(email, toLucidUserTransaction(transaction))
    return user ? UserInfraMapper.toRecord(user) : null
  }

  async findByIds(
    userIds: string[],
    columns?: string[],
    transaction?: UserTransaction
  ): Promise<UserRecord[]> {
    const users = await userModelQueries.findByIds(
      userIds,
      columns,
      toLucidUserTransaction(transaction)
    )
    return users.map((user) => UserInfraMapper.toRecord(user))
  }

  findIdsByUsernameLike(username: string): Promise<string[]> {
    return userModelQueries.findIdsByUsernameLike(username)
  }

  async findIdsBySearch(search: string): Promise<string[]> {
    const users = await userModelQueries
      .queryNotDeleted()
      .select('id')
      .where((query) => {
        void query
          .where('username', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
      })
    return users.map((user) => user.id)
  }

  listTalentExplainabilityProjectionTargetIds(
    afterId: string | null,
    limit: number,
    transaction?: UserTransaction
  ): Promise<string[]> {
    return userModelQueries.listTalentExplainabilityProjectionTargetIds(
      afterId,
      limit,
      toLucidUserTransaction(transaction)
    )
  }

  async findNotDeletedOrFail(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    return userModelQueries.findNotDeletedOrFailRecord(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  async findActiveOrFail(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    const user = await userModelQueries.findActiveOrFail(
      userId,
      toLucidUserTransaction(transaction)
    )
    return UserInfraMapper.toRecord(user)
  }

  async findProfile(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    const user = await userModelQueries.findProfile(userId, toLucidUserTransaction(transaction))
    return UserInfraMapper.toRecord(user)
  }

  getSystemRoleName(
    userId: string,
    transaction?: UserTransaction
  ): Promise<string | null> {
    return userModelQueries.getSystemRoleName(userId, toLucidUserTransaction(transaction))
  }

  isActive(userId: string, transaction?: UserTransaction): Promise<boolean> {
    return userModelQueries.isActive(userId, toLucidUserTransaction(transaction))
  }

  isExternalContributor(
    userId: string,
    transaction?: UserTransaction
  ): Promise<boolean> {
    return userModelQueries.isExternalContributor(
      userId,
      toLucidUserTransaction(transaction)
    )
  }

  isSuperadmin(userId: string, transaction?: UserTransaction): Promise<boolean> {
    return userModelQueries.isSuperadmin(userId, toLucidUserTransaction(transaction))
  }

  create(
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    return userMutations.createRecord(data, toLucidUserTransaction(transaction))
  }

  update(
    userId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    return userMutations.updateByIdRecord(
      userId,
      data,
      toLucidUserTransaction(transaction)
    )
  }

  updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    transaction?: UserTransaction
  ): Promise<void> {
    return userMutations.updateCurrentOrganization(
      userId,
      organizationId,
      toLucidUserTransaction(transaction)
    )
  }

  async softDelete(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    const user = await userModelQueries.findNotDeletedOrFail(userId, lucidTransaction)
    const deleted = await userMutations.softDelete(user, lucidTransaction)
    return UserInfraMapper.toRecord(deleted)
  }

  mergeTrustData(
    userId: string,
    trustData: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<void> {
    return userMutations.mergeTrustData(
      userId,
      trustData,
      toLucidUserTransaction(transaction)
    )
  }

  updateCredibilityData(
    userId: string,
    credibilityData: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<void> {
    return userMutations.updateCredibilityData(
      userId,
      credibilityData as unknown as UserCredibilityData,
      toLucidUserTransaction(transaction)
    )
  }

  applyTalentExplainabilityProjectionV1(
    userId: string,
    projection: UserTalentExplainabilityProjectionV1,
    transaction: UserTransaction
  ): Promise<boolean> {
    const lucidTransaction = toLucidUserTransaction(transaction)
    if (!lucidTransaction) {
      throw new TypeError('User explainability projection requires a transaction')
    }
    return userMutations.applyTalentExplainabilityProjectionV1(
      userId,
      projection,
      lucidTransaction
    )
  }

  async paginate(
    options: UserListReadOptions,
    transaction?: UserTransaction
  ): Promise<{ items: UserRecord[]; total: number }> {
    const result = await userModelQueries.paginateUsersList(
      options,
      toLucidUserTransaction(transaction)
    )
    return {
      items: result.all().map((user) => UserInfraMapper.toRecord(user)),
      total: result.total,
    }
  }

  async listForAdministration(
    options: UserAdministrationListOptions
  ): Promise<{ items: UserRecord[]; total: number }> {
    const query = userModelQueries.queryNotDeleted()
    const search = options.search
    if (search) {
      void query.where((searchQuery) => {
        void searchQuery
          .where('username', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`)
      })
    }
    if (options.systemRole) void query.where('system_role', options.systemRole)
    if (options.status) void query.where('status', options.status)
    const userIds = options.userIds
    if (userIds?.length) {
      void query.whereIn('id', userIds)
      const rank = userIds
        .map((userId, index) => `WHEN id = '${userId}' THEN ${String(index)}`)
        .join(' ')
      void query.orderByRaw(`CASE ${rank} ELSE ${String(userIds.length)} END ASC`)
    } else {
      void query.orderBy('created_at', 'desc').orderBy('id', 'desc')
    }
    const result = await query.paginate(options.page, options.perPage)
    return {
      items: result.all().map((user) => UserInfraMapper.toRecord(user)),
      total: result.total,
    }
  }

  async getAdministrationStats(): Promise<UserAdministrationStats> {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    type CountRow = { total?: string | number }
    const [total, active, suspended, newThisMonth] = (await Promise.all([
      db.from('users').count('* as total').whereNull('deleted_at').first(),
      db
        .from('users')
        .count('* as total')
        .where('status', UserStatusName.ACTIVE)
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('status', UserStatusName.SUSPENDED)
        .whereNull('deleted_at')
        .first(),
      db
        .from('users')
        .count('* as total')
        .where('created_at', '>=', firstDayOfMonth)
        .whereNull('deleted_at')
        .first(),
    ])) as [
      CountRow | undefined,
      CountRow | undefined,
      CountRow | undefined,
      CountRow | undefined,
    ]
    return {
      total: toNumber(total?.total),
      active: toNumber(active?.total),
      suspended: toNumber(suspended?.total),
      newThisMonth: toNumber(newThisMonth?.total),
    }
  }
}
