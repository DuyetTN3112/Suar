import {
  type ComposedUserAdministrationDirectory,
  type ComposedUserAdministrationLifecycle,
  type UserAdministrationStatus,
} from '#composition/adapters/users/composed_user_administration'
import type {
  AdminManagedUserStatus,
  AdminUserAccountLifecycleEvent,
  AdminUserDirectoryFilters,
  AdminUserDirectoryRecord,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import type { UserLifecycleEventStager } from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import { UserStatusName } from '#modules/users/public_contracts/user_constants'

const serializeDateTime = (
  value: string | { toISO(): string | null } | null
): string => {
  const serialized = typeof value === 'string' ? value : value?.toISO() ?? null
  return serialized ?? new Date().toISOString()
}

function toAdminUserRecord(
  user: NonNullable<Awaited<ReturnType<ComposedUserAdministrationDirectory['findById']>>>
): AdminUserDirectoryRecord {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    systemRole: user.system_role,
    status: user.status,
    currentOrganizationId: user.current_organization_id,
    isExternalContributor: user.is_external_contributor,
    createdAt: serializeDateTime(user.created_at),
    updatedAt: serializeDateTime(user.updated_at),
  }
}

export class AdminUserDirectoryAdapter extends AdminUserDirectory {
  constructor(
    private readonly directory: ComposedUserAdministrationDirectory
  ) {
    super()
  }

  async listUsers(
    filters: AdminUserDirectoryFilters,
    page: number,
    perPage: number
  ) {
    const result = await this.directory.listUsers(filters, page, perPage)
    return {
      users: result.users.map(toAdminUserRecord),
      total: result.total,
    }
  }

  async getUserStats() {
    return this.directory.getUserStats()
  }

  async findById(userId: string): Promise<AdminUserDirectoryRecord | null> {
    const user = await this.directory.findById(userId)
    return user ? toAdminUserRecord(user) : null
  }
}

const USER_STATUS_BY_ADMIN_STATUS: Record<
  AdminManagedUserStatus,
  UserAdministrationStatus
> = {
  active: UserStatusName.ACTIVE,
  suspended: UserStatusName.SUSPENDED,
}

export class AdminUserLifecycleWriterAdapter extends AdminUserLifecycleWriter {
  constructor(
    private readonly lifecycle: ComposedUserAdministrationLifecycle,
    private readonly lifecycleEvents: UserLifecycleEventStager
  ) {
    super()
  }

  updateSystemRole(
    userId: string,
    systemRole: string,
    trx?: Parameters<AdminUserLifecycleWriter['updateSystemRole']>[2]
  ): Promise<void> {
    return this.lifecycle.updateSystemRole(
      userId,
      systemRole,
      trx
    )
  }

  updateStatus(
    userId: string,
    status: AdminManagedUserStatus,
    trx?: Parameters<AdminUserLifecycleWriter['updateStatus']>[2]
  ): Promise<void> {
    return this.lifecycle.updateStatus(
      userId,
      USER_STATUS_BY_ADMIN_STATUS[status],
      trx
    )
  }

  stageAccountLifecycle(
    event: AdminUserAccountLifecycleEvent,
    trx: Parameters<AdminUserLifecycleWriter['stageAccountLifecycle']>[1]
  ): Promise<void> {
    return this.lifecycleEvents.stageAccountLifecycle(trx, event)
  }
}
