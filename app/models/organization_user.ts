import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Organization from './organization.js'
import UserRole from './user_role.js'

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
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>
  @belongsTo(() => UserRole, {
    foreignKey: 'role_id',
  })
  declare role: BelongsTo<typeof UserRole>
}

// Tạo alias cho export default để có thể import cả trực tiếp và destructuring
export { OrganizationUser }
