import MongoUserActivityLog from '#models/mongo/user_activity_log'
import loggerService from '#services/logger_service'
import type {
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#infra/shared/repositories/interfaces'
import type { DatabaseId } from '#types/database'
import type { Types } from 'mongoose'

/** Shape of a lean user activity log document from MongoDB */
interface ActivityLogLeanDoc {
  _id: Types.ObjectId
  user_id: string
  action_type: string
  action_data?: Record<string, unknown>
  related_entity_type?: string
  related_entity_id?: string
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

/**
 * MongoDB UserActivityLog Repository — Mongoose implementation.
 *
 * Optimized for very high-volume appends, time-series reads, auto-expiry (TTL 180 days).
 */
export default class MongoUserActivityLogRepository implements UserActivityLogRepository {
  async create(data: UserActivityLogCreateData): Promise<void> {
    try {
      await new MongoUserActivityLog({
        user_id: String(data.user_id),
        action_type: data.action_type,
        action_data: data.action_data ?? undefined,
        related_entity_type: data.related_entity_type ?? undefined,
        related_entity_id: data.related_entity_id ? String(data.related_entity_id) : undefined,
        ip_address: data.ip_address ?? undefined,
        user_agent: data.user_agent ?? undefined,
      }).save()
    } catch (error) {
      loggerService.error('MongoUserActivityLogRepository.create failed', {
        userId: data.user_id,
        actionType: data.action_type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 50
    const skip = (page - 1) * limit

    const filter: Record<string, string> = { user_id: String(userId) }
    if (options?.actionType) {
      filter.action_type = options.actionType
    }

    const [rawDocs, total] = await Promise.all([
      MongoUserActivityLog.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      MongoUserActivityLog.countDocuments(filter).exec(),
    ])

    const docs = rawDocs as unknown as ActivityLogLeanDoc[]

    return {
      data: docs.map((doc) => this.toRecord(doc)),
      total,
    }
  }

  private toRecord(doc: ActivityLogLeanDoc): UserActivityLogRecord {
    return {
      id: String(doc._id),
      user_id: doc.user_id,
      action_type: doc.action_type,
      action_data: doc.action_data ?? null,
      related_entity_type: doc.related_entity_type ?? null,
      related_entity_id: doc.related_entity_id ?? null,
      ip_address: doc.ip_address ?? null,
      user_agent: doc.user_agent ?? null,
      created_at: doc.created_at ?? new Date(),
    }
  }
}
