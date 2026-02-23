import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectActor,
  ProjectActorLookup,
} from '#modules/projects/application/ports/project_actor_lookup'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export class UsersPublicApiProjectActorLookup implements ProjectActorLookup {
  async findProjectActor(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectActor | null> {
    const user = await userPublicApi.findNotDeletedOrFail(userId, trx)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      systemRole: user.system_role,
    }
  }
}
