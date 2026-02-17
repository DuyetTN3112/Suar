import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationMembershipRepository } from '#composition/organization_persistence_composition'
import { userPublicApi } from '#composition/user_application_composition'
import type {
  TaskTalentExplainabilitySummary,
  TaskUserIdentity,
  TaskUserOption,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export class TaskUserReaderAdapter implements TaskUserReader {
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

  async findUserIdentities(
    userIds: string[],
    trx?: TransactionClientContract
  ): Promise<TaskUserIdentity[]> {
    const users = await userPublicApi.findModerationIdentityFactsV1(userIds, trx)
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
    }))
  }

  isExternalContributor(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isExternalContributor(userId, trx)
  }

  async listUsersByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskUserOption[]> {
    const memberUserIds = await organizationMembershipRepository.listMemberUserIds(
      organizationId,
      undefined,
      trx
    )
    const users = await userPublicApi.findByIds(
      memberUserIds,
      ['id', 'username', 'email', 'avatar_url'],
      trx
    )

    return users
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email ?? '',
        avatar_url: user.avatar_url ?? null,
      }))
      .sort((left, right) => left.username.localeCompare(right.username))
  }

  getTalentExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, TaskTalentExplainabilitySummary>> {
    return userPublicApi.getTalentExplainabilitySummaryByUserId(userIds)
  }
}
