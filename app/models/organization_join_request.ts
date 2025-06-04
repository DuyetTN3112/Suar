import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import User from '#models/user'
import Organization from '#models/organization'

/**
 * Model: OrganizationJoinRequest
 *
 * Quản lý yêu cầu tham gia tổ chức.
 * Bảng: organization_join_requests
 */
export default class OrganizationJoinRequest extends BaseModel {
  static override table = 'organization_join_requests'

  @column({ isPrimary: true })
  declare id: DatabaseId

  @column()
  declare organization_id: DatabaseId

  @column()
  declare user_id: DatabaseId

  @column()
  declare message: string

  @column()
  declare status: OrganizationUserStatus

  @column()
  declare processed_by: DatabaseId | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>
}
