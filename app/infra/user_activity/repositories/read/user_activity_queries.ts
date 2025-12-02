import { toUserActivityLogRecord, type ActivityLogLeanDoc } from './shared.js'

import MongoUserActivityLog from '#infra/user_activity/models/user_activity_log'
import type { UserActivityLogRecord } from '#infra/user_activity/repositories/user_activity_repository_interface'
import type { DatabaseId } from '#types/database'


export const findByUser = async (
  userId: DatabaseId,
  options?: { actionType?: string; limit?: number; page?: number }
): Promise<{ data: UserActivityLogRecord[]; total: number }> => {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const skip = (page - 1) * limit

  const filter: Record<string, string> = { user_id: userId }
  if (options?.actionType) {
    filter.action_type = options.actionType
  }

  const [rawDocs, total] = await Promise.all([
    MongoUserActivityLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
    MongoUserActivityLog.countDocuments(filter).exec(),
  ])

  const docs = rawDocs as unknown as ActivityLogLeanDoc[]

  return {
    data: docs.map((doc) => toUserActivityLogRecord(doc)),
    total,
  }
}
