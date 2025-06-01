import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import User from './user.js'

export default class Notification extends BaseModel {
  static override table = 'notifications'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare title: string

  @column()
  declare message: string

  @column()
  declare is_read: boolean

  @column()
  declare type: string

  @column()
  declare related_entity_type: string | null

  @column()
  declare related_entity_id: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm notification thuộc user hoặc throw error
   */
  static async findByUserOrFail(
    notificationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('id', notificationId).where('user_id', userId).firstOrFail()
  }

  /**
   * Xóa tất cả notification đã đọc của user
   */
  static async deleteAllReadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('user_id', userId).where('is_read', true).delete()
  }

  /**
   * Đánh dấu tất cả notification chưa đọc thành đã đọc cho user
   */
  static async markAllAsReadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('user_id', userId).where('is_read', false).update({ is_read: true })
  }

  /**
   * Lấy danh sách notifications của user với filters, phân trang
   */
  static async paginateByUser(
    userId: DatabaseId,
    options: { page: number; limit: number; isRead?: boolean; type?: string },
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const q = query.where('user_id', userId).orderBy('created_at', 'desc')

    if (options.isRead !== undefined) {
      void q.where('is_read', options.isRead)
    }
    if (options.type) {
      void q.where('type', options.type)
    }

    return q.paginate(options.page, options.limit)
  }

  /**
   * Đếm số notification chưa đọc của user
   */
  static async countUnreadByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query.where('user_id', userId).where('is_read', false).count('id as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }
}
