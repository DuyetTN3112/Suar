import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '../../../users/infra/models/user.js'

import Organization from '#modules/organizations/infra/models/organization'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

/**
 * Model: OrganizationJoinRequest
 *
 * Quản lý yêu cầu tham gia tổ chức.
 * Bảng: organization_join_requests
 */
export default class OrganizationJoinRequest extends BaseModel {
  static override table = 'organization_join_requests'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare organization_id: string

  @column()
  declare user_id: string

  @column()
  declare message: string

  @column()
  declare status: OrganizationUserStatus

  @column()
  declare processed_by: string | null

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
