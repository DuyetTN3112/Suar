import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Organization from './organization.js'

// Class chứa thông tin quan hệ giữa User và Organization
export default class OrganizationUser extends BaseModel {
  static table = 'organization_users'
  @column({ isPrimary: true, serializeAs: null })
  declare organization_id: number
  @column({ isPrimary: true, serializeAs: null })
  declare user_id: number
  @column()
  declare role_id: number
  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}

// Tạo alias cho export default để có thể import cả trực tiếp và destructuring
export { OrganizationUser }
