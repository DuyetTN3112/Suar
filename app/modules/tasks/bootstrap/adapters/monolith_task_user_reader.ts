import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  TaskUserIdentity,
  TaskUserOption,
  TaskUserReader,
} from '#modules/tasks/actions/ports/task_external_dependencies'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export class MonolithTaskUserReader implements TaskUserReader {
  async ensureActiveUser(userId: string, trx?: TransactionClientContract): Promise<void> {
    await userPublicApi.ensureActiveUser(userId, trx)
  }

  async findUserIdentity(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity | null> {
    const user = await userPublicApi.findById(userId, trx)
    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    }
  }

  async isFreelancer(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isFreelancer(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]> {
    const users = await userPublicApi.listUsersByOrganization(organizationId, trx)

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email ?? '',
    }))
  }
}
