
import PostgresUserActivityLogRepository from './postgres_user_activity_log_repository.js'
import type { UserActivityLogRepository } from './user_activity_repository_interface.js'

import loggerService from '#modules/logger/public_contracts/logger_service'

let activityLogRepo: UserActivityLogRepository | null = null

export function getUserActivityLogRepository(): UserActivityLogRepository {
  if (activityLogRepo) return activityLogRepo

  activityLogRepo = new PostgresUserActivityLogRepository()
  loggerService.info('UserActivityLog repository initialized: postgres')
  return activityLogRepo
}

export const userActivityRepositoryProvider = {
  getUserActivityLogRepository,
} as const
