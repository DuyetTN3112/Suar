
import MongoUserActivityLogRepository from './mongo_user_activity_log_repository.js'
import type { UserActivityLogRepository } from './user_activity_repository_interface.js'

import loggerService from '#infra/logger/logger_service'

let activityLogRepo: UserActivityLogRepository | null = null

export function getUserActivityLogRepository(): UserActivityLogRepository {
  if (activityLogRepo) return activityLogRepo

  activityLogRepo = new MongoUserActivityLogRepository()
  loggerService.info('UserActivityLog repository initialized: mongodb')
  return activityLogRepo
}

export const userActivityRepositoryProvider = {
  getUserActivityLogRepository,
} as const
