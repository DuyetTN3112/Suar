import mongoose from 'mongoose'

/**
 * MongoDB Schema: notifications
 *
 * Notifications are ideal for MongoDB because:
 *   - High write frequency (created on every user action)
 *   - Simple read pattern (user's notifications, sorted by time)
 *   - Never joined with other tables
 *   - TTL auto-expiry (old notifications are irrelevant)
 *   - Schema flexibility (type-specific metadata can vary)
 */
const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true }, // UUID or INT as string
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    type: { type: String, required: true },
    related_entity_type: { type: String },
    related_entity_id: { type: String }, // UUID or INT as string
    metadata: { type: mongoose.Schema.Types.Mixed }, // Extra data per notification type
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'notifications',
  }
)

// Compound indexes matching MySQL index patterns
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 })
notificationSchema.index({ type: 1, created_at: -1 })

// TTL index: auto-delete notifications older than 90 days
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

/**
 * MongoNotification Mongoose Model
 *
 * Usage:
 *   await MongoNotification.create({ user_id: '...', title: '...', ... })
 *   const unread = await MongoNotification.find({ user_id: '...', is_read: false })
 *     .sort({ created_at: -1 })
 *     .limit(20)
 */
const MongoNotification = mongoose.model('Notification', notificationSchema)

export default MongoNotification
