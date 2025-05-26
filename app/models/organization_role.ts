import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Organization from './organization.js'
import OrganizationUser from './organization_user.js'

export default class OrganizationRole extends BaseModel {
  static table = 'organization_roles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organization_id: number | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? JSON.parse(value) : null),
  })
  declare permissions: string[] | null

  @column()
  declare is_custom: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => OrganizationUser, {
    foreignKey: 'organization_role_id',
  })
  declare organization_users: HasMany<typeof OrganizationUser>

  // Helper methods
  hasPermission(permission: string): boolean {
    return this.permissions?.includes(permission) || false
  }
}
