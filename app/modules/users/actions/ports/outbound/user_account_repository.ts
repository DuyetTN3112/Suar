import type { UserTransaction } from './user_transaction.js'

import type { UserTalentExplainabilityProjectionV1 } from '#modules/users/types/user_profile_data'
import type { UserRecord } from '#modules/users/types/user_records'

export interface UserListReadOptions {
  page: number
  limit: number
  search?: string
  roleId?: string | number | null
  statusId?: string | number | null
  excludeStatusId?: string | number | null
  includeUserIds?: string[]
  excludeUserIds?: string[]
}

export interface UserAdministrationListOptions {
  search?: string
  systemRole?: string
  status?: string
  userIds?: string[]
  page: number
  perPage: number
}

export interface UserAdministrationStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

export interface UserAccountRepository {
  findById(userId: string, transaction?: UserTransaction): Promise<UserRecord | null>
  findByEmail(email: string, transaction?: UserTransaction): Promise<UserRecord | null>
  findByIds(
    userIds: string[],
    columns?: string[],
    transaction?: UserTransaction
  ): Promise<UserRecord[]>
  findIdsByUsernameLike(username: string): Promise<string[]>
  findIdsBySearch(search: string): Promise<string[]>
  listTalentExplainabilityProjectionTargetIds(
    afterId: string | null,
    limit: number,
    transaction?: UserTransaction
  ): Promise<string[]>
  findNotDeletedOrFail(
    userId: string,
    transaction?: UserTransaction
  ): Promise<UserRecord>
  findActiveOrFail(userId: string, transaction?: UserTransaction): Promise<UserRecord>
  findProfile(userId: string, transaction?: UserTransaction): Promise<UserRecord>
  getSystemRoleName(
    userId: string,
    transaction?: UserTransaction
  ): Promise<string | null>
  isActive(userId: string, transaction?: UserTransaction): Promise<boolean>
  isExternalContributor(
    userId: string,
    transaction?: UserTransaction
  ): Promise<boolean>
  isSuperadmin(userId: string, transaction?: UserTransaction): Promise<boolean>
  create(data: Record<string, unknown>, transaction?: UserTransaction): Promise<UserRecord>
  update(
    userId: string,
    data: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<UserRecord>
  updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    transaction?: UserTransaction
  ): Promise<void>
  softDelete(userId: string, transaction?: UserTransaction): Promise<UserRecord>
  mergeTrustData(
    userId: string,
    trustData: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<void>
  updateCredibilityData(
    userId: string,
    credibilityData: Record<string, unknown>,
    transaction?: UserTransaction
  ): Promise<void>
  applyTalentExplainabilityProjectionV1(
    userId: string,
    projection: UserTalentExplainabilityProjectionV1,
    transaction: UserTransaction
  ): Promise<boolean>
  paginate(
    options: UserListReadOptions,
    transaction?: UserTransaction
  ): Promise<{ items: UserRecord[]; total: number }>
  listForAdministration(
    options: UserAdministrationListOptions
  ): Promise<{ items: UserRecord[]; total: number }>
  getAdministrationStats(): Promise<UserAdministrationStats>
}
