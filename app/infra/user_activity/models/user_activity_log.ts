import mongoose from 'mongoose'

/**
 * MongoDB Schema: user_activity_logs
 *
 * Activity logs are ideal for MongoDB because:
 *   - Append-only, very high volume
 *   - Never updated after insert
 *   - Flexible action_data (varies per action_type)
 *   - Used for anomaly detection (time-series reads)
 *   - TTL auto-expiry
 */
const userActivityLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true }, // UUID or INT as string
    action_type: { type: String, required: true }, // review_given, login, etc.
    action_data: { type: mongoose.Schema.Types.Mixed }, // Flexible JSON per action
    related_entity_type: { type: String },
    related_entity_id: { type: String },
    ip_address: { type: String },
    user_agent: { type: String, maxlength: 255 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'user_activity_logs',
  }
)

// Compound indexes for common queries
userActivityLogSchema.index({ user_id: 1, created_at: -1 })
userActivityLogSchema.index({ action_type: 1, created_at: -1 })
userActivityLogSchema.index({ related_entity_type: 1, related_entity_id: 1 })

// TTL: auto-delete activity logs older than 180 days
userActivityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 })

/**
 * MongoUserActivityLog Mongoose Model
 */
const MongoUserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema)

export default MongoUserActivityLog
