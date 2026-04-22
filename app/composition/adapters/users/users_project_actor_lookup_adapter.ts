import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import type {
  ProjectActor,
  ProjectActorLookup,
} from '#modules/projects/actions/ports/outbound/project_actor_lookup'

export class UsersProjectActorLookupAdapter implements ProjectActorLookup {
  async findProjectActor(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectActor | null> {
    const user = await userPublicApi.findNotDeletedOrFail(userId, trx)

    return {
      id: user.id,
      username: user.username,
      email: user.email,
    }
  }
}
