import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import {
  ProjectUserReader,
  type ProjectActorInfo,
  type ProjectTalentExplainabilitySummary,
  type ProjectUserIdentitySummary,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'

export class ProjectUserReaderAdapter extends ProjectUserReader {
  async findActorInfo(userId: string, trx?: TransactionClientContract): Promise<ProjectActorInfo> {
    const user = await userPublicApi.findNotDeletedOrFail(userId, trx)
    return {
      id: user.id,
      username: user.username,
    }
  }

  async findIdentitySummaries(
    userIds: string[],
    trx?: TransactionClientContract
  ): Promise<ProjectUserIdentitySummary[]> {
    const users = await userPublicApi.findModerationIdentityFactsV1(userIds, trx)
    return users.map((user) => ({
      id: user.id,
      username: user.username,
    }))
  }

  findTalentExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, ProjectTalentExplainabilitySummary>> {
    return userPublicApi.getTalentExplainabilitySummaryByUserId(userIds)
  }

  isActiveUser(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isActive(userId, trx)
  }
}
