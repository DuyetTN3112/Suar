import mongoose from 'mongoose'

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
 * AuditLog Mongoose Model
 *
 * Usage:
 *   await MongoAuditLog.create({ user_id: '...', action: 'create', ... })
 *   const logs = await MongoAuditLog.find({ entity_type: 'task' }).sort({ created_at: -1 })
 */
const MongoAuditLog = mongoose.model('AuditLog', auditLogSchema)

export default MongoAuditLog
