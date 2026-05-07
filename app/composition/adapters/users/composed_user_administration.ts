import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import { type UserStatusName } from '#modules/users/public_contracts/user_constants'
import type { UserRecord } from '#modules/users/types/user_records'

export interface UserAdministrationListFilters {
  search?: string
  systemRole?: string
  status?: string
  userIds?: string[]
}

export interface UserAdministrationListResult {
  users: UserRecord[]
  total: number
}

export interface UserAdministrationStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

export class ComposedUserAdministrationDirectory {
  constructor(private readonly users: UserAccountRepository) {}

  async listUsers(
    filters: UserAdministrationListFilters,
    page: number,
    perPage: number
  ): Promise<UserAdministrationListResult> {
    const result = await this.users.listForAdministration({
      ...filters,
      page,
      perPage,
    })
    return {
      users: result.items,
      total: result.total,
    }
  }

  async getUserStats(): Promise<UserAdministrationStats> {
    return this.users.getAdministrationStats()
  }

  findById(
    userId: string,
    trx?: UserTransaction
  ): Promise<UserRecord | null> {
    return this.users.findById(userId, trx)
  }
}

export type UserAdministrationStatus =
  | UserStatusName.ACTIVE
  | UserStatusName.SUSPENDED

export class ComposedUserAdministrationLifecycle {
  constructor(private readonly users: UserAccountRepository) {}

  async updateSystemRole(
    userId: string,
    systemRole: string,
    trx?: UserTransaction
  ): Promise<void> {
    await this.users.update(userId, { system_role: systemRole }, trx)
  }

  async updateStatus(
    userId: string,
    status: UserAdministrationStatus,
    trx?: UserTransaction
  ): Promise<void> {
    await this.users.update(userId, { status }, trx)
  }
}
