import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'
import {
  SystemRoleName,
  UserStatusName,
} from '#modules/users/public_contracts/user_constants'

export interface UserSocialLoginIdentity {
  id: string
  email: string | null
  system_role: string
  current_organization_id: string | null
  auth_method: 'google' | 'github'
}

export interface NewUserSocialLoginIdentity {
  email: string
  username: string
  auth_method: 'google' | 'github'
}

function toIdentity(user: {
  id: string
  email: string | null
  system_role: string
  current_organization_id: string | null
  auth_method: 'google' | 'github'
}): UserSocialLoginIdentity {
  return {
    id: user.id,
    email: user.email,
    system_role: user.system_role,
    current_organization_id: user.current_organization_id,
    auth_method: user.auth_method,
  }
}

export class ComposedUserSocialLoginIdentityPersistence {
  constructor(private readonly users: UserAccountRepository) {}

  async findById(
    userId: string,
    trx?: UserTransaction
  ): Promise<UserSocialLoginIdentity | null> {
    const user = await this.users.findById(userId, trx)
    return user ? toIdentity(user) : null
  }

  async findByEmail(
    email: string,
    trx?: UserTransaction
  ): Promise<UserSocialLoginIdentity | null> {
    const user = await this.users.findByEmail(email, trx)
    return user ? toIdentity(user) : null
  }

  async create(
    identity: NewUserSocialLoginIdentity,
    trx: UserTransaction
  ): Promise<UserSocialLoginIdentity> {
    const user = await this.users.create(
      {
        ...identity,
        status: UserStatusName.ACTIVE,
        system_role: SystemRoleName.REGISTERED_USER,
        current_organization_id: null,
      },
      trx
    )
    return toIdentity(user)
  }

  async synchronizeAuthMethod(
    userId: string,
    authMethod: 'google' | 'github',
    trx: UserTransaction
  ): Promise<void> {
    const user = await this.users.findNotDeletedOrFail(userId, trx)
    if (user.auth_method === authMethod) {
      return
    }

    await this.users.update(userId, { auth_method: authMethod }, trx)
  }
}
