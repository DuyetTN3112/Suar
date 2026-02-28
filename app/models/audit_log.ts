import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DatabaseId } from '#types/database'
import User from './user.js'

export default class AuditLog extends BaseModel {
  static override table = 'audit_logs'

  // Turn off timestamps since we only need created_at
  static $timestamps = false

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: DatabaseId | null

  @column()
  declare action: string

  @column()
  declare entity_type: string

  @column()
  // FIX: string thay vì number — compatible với cả INT (legacy) và UUIDv7
  declare entity_id: DatabaseId | null

  @column()
  declare old_values: object | null

  @column()
  declare new_values: object | null

  @column()
  declare ip_address: string | null

  @column()
  declare user_agent: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  // ===== Static Methods (Fat Model) =====

  /**
   * Lấy recent activity cho entity (with user info)
   * Thay thế: db.from('audit_logs').leftJoin('users').where('entity_type', ...).orderBy(...)
   */
  static async getRecentActivity(
    entityType: string,
    entityId: DatabaseId,
    limit: number = 10
  ): Promise<AuditLog[]> {
    return this.query()
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('user')
  }

  /**
   * Lấy last activity timestamp cho batch users within entity
   * Thay thế: db.from('audit_logs').select('user_id').max('created_at').whereIn('user_id', ...).groupBy(...)
   */
  static async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>> {
    if (userIds.length === 0) return new Map()
    const db = (await import('@adonisjs/lucid/services/db')).default
    const results = (await db
      .from('audit_logs')
      .select('user_id')
      .max('created_at as last_active')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .whereIn('user_id', userIds)
      .groupBy('user_id')) as Array<{ user_id: DatabaseId; last_active: Date | null }>

    const map = new Map<string, Date | null>()
    for (const row of results) {
      map.set(String(row.user_id), row.last_active)
    }
    return map
  }
}
