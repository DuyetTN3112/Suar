import * as userActivityQueries from './read/user_activity_queries.js'
import * as userActivityMutations from './write/user_activity_mutations.js'

import type {
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#infra/user_activity/repositories/user_activity_repository_interface'
import type { DatabaseId } from '#types/database'

/**
 * MongoDB UserActivityLog Repository — Mongoose implementation.
 *
 * Optimized for very high-volume appends, time-series reads, auto-expiry (TTL 180 days).
 */
export default class MongoUserActivityLogRepository implements UserActivityLogRepository {
  async create(data: UserActivityLogCreateData): Promise<void> {
    await userActivityMutations.create(data)
  }

  async findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    return userActivityQueries.findByUser(userId, options)
  }
}
