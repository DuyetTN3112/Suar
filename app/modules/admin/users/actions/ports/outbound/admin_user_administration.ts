import type { AdminTransaction } from '#modules/admin/users/actions/ports/outbound/admin_transaction_runner'

export interface AdminUserDirectoryFilters {
  search?: string
  systemRole?: string
  status?: string
  userIds?: string[]
}

export interface AdminUserDirectoryRecord {
  id: string
  username: string
  email: string | null
  systemRole: string
  status: string
  currentOrganizationId: string | null
  isExternalContributor: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminUserDirectoryPage {
  users: AdminUserDirectoryRecord[]
  total: number
}

export interface AdminUserStats {
  total: number
  active: number
  suspended: number
  newThisMonth: number
}

export abstract class AdminUserDirectory {
  abstract listUsers(
    filters: AdminUserDirectoryFilters,
    page: number,
    perPage: number
  ): Promise<AdminUserDirectoryPage>

  abstract getUserStats(): Promise<AdminUserStats>

  abstract findById(userId: string): Promise<AdminUserDirectoryRecord | null>
}

export type AdminManagedUserStatus = 'active' | 'suspended'

export interface AdminUserAccountLifecycleEvent {
  mutationId: string
  action: 'suspended' | 'activated'
  userId: string
  actorId: string
  occurredAt: string
}

export abstract class AdminUserLifecycleWriter {
  abstract updateSystemRole(
    userId: string,
    systemRole: string,
    trx?: AdminTransaction
  ): Promise<void>

  abstract updateStatus(
    userId: string,
    status: AdminManagedUserStatus,
    trx?: AdminTransaction
  ): Promise<void>

  abstract stageAccountLifecycle(
    event: AdminUserAccountLifecycleEvent,
    trx: AdminTransaction
  ): Promise<void>
}
