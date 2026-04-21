import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'

export interface UserSessionIdentity {
  id: string
  email: string | null
  system_role: string
  current_organization_id: string | null
  status: string
  deleted_at: string | null
}

const serializeDateTime = (
  value: string | { toISO(): string | null } | null
): string | null => (typeof value === 'string' ? value : value?.toISO() ?? null)

export class ComposedUserIdentityReader {
  constructor(private readonly users: UserAccountRepository) {}

  async findSessionIdentity(userId: string): Promise<UserSessionIdentity | null> {
    const user = await this.users.findById(userId)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      system_role: user.system_role,
      current_organization_id: user.current_organization_id,
      status: user.status,
      deleted_at: serializeDateTime(user.deleted_at),
    }
  }

  getSystemRoleName(
    userId: string,
    trx?: UserTransaction
  ): Promise<string | null> {
    return this.users.getSystemRoleName(userId, trx)
  }

  isSystemSuperadmin(
    userId: string,
    trx?: UserTransaction
  ): Promise<boolean> {
    return this.users.isSuperadmin(userId, trx)
  }
}
