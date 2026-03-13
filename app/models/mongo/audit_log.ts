import mongoose from 'mongoose'
import loggerService from '#services/logger_service'

/**
 * MongoDB Schema: audit_logs
 *
 * Audit logs are ideal for MongoDB because:
 *   - Append-only (never updated)
 *   - Never joined with other tables in queries
 *   - High write volume
 *   - Schema can evolve (old_values/new_values are flexible JSON)
 *   - Natural TTL support (auto-expire old logs)
 *   - Time-series optimized storage
 *
 * Uses ObjectId for _id (already time-sortable like UUIDv7).
 * entity_id stored as string to support both legacy INT and UUID formats.
 */
const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, index: true }, // UUID or INT as string
    action: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String }, // UUID or INT as string
    old_values: { type: mongoose.Schema.Types.Mixed },
    new_values: { type: mongoose.Schema.Types.Mixed },
    ip_address: { type: String },
    user_agent: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'audit_logs',

    // Optimize for time-series reads
    timeseries: undefined, // Use regular collection (timeseries requires MongoDB 5.0+)
  }
)

// Compound indexes for common query patterns
auditLogSchema.index({ created_at: -1, user_id: 1 })
auditLogSchema.index({ entity_type: 1, entity_id: 1 })
auditLogSchema.index({ action: 1, created_at: -1 })

// TTL index: auto-delete logs older than 1 year (365 days)
auditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 })

/**
 * Raw Mongoose Model — used by MongoAuditLogRepository for direct queries.
 */
export const MongoAuditLogModel = mongoose.model('AuditLog', auditLogSchema)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditLogData = Record<string, any>

/**
 * AuditLog — Safe wrapper around Mongoose model.
 *
 * Audit logging should never break business operations.
 * create() and find() catch MongoDB errors instead of throwing.
 *
 * Usage:
 *   await AuditLog.create({ user_id: '...', action: 'create', ... })
 *   const logs = await AuditLog.find({ entity_type: 'task' })
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class AuditLog {
  /**
   * Safe create — logs and swallows MongoDB errors.
   */
  static async create(data: AuditLogData): Promise<unknown> {
    try {
      return await MongoAuditLogModel.create(data)
    } catch (error) {
      loggerService.warn('[AuditLog] Failed to create audit log (MongoDB unavailable)', {
        action: data.action,
        entity_type: data.entity_type,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Safe query — wraps find() for chaining.
   */
  static query() {
    return MongoAuditLogModel.find()
  }

  /**
   * Safe find — wraps find with error handling.
   */
  static async find(filter: AuditLogData): Promise<unknown[]> {
    try {
      return await MongoAuditLogModel.find(filter).lean().exec()
    } catch (error) {
      loggerService.warn('[AuditLog] Failed to query audit logs (MongoDB unavailable)', {
        error: error instanceof Error ? error.message : String(error),
      })
      return []
    }
  }
}

export default AuditLog
