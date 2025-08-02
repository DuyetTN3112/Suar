import type { UserActivityLogCreateData } from '#infra/user_activity/repositories/user_activity_repository_interface'
import { userActivityRepositoryProvider } from '#infra/user_activity/repositories/user_activity_repository_provider'

export class UserActivityPublicApi {
  async create(data: UserActivityLogCreateData): Promise<void> {
    const activityRepo = userActivityRepositoryProvider.getUserActivityLogRepository()
    await activityRepo.create(data)
  }
}

export const userActivityPublicApi = new UserActivityPublicApi()
