import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class SystemRole extends BaseModel {
  static override table = 'system_roles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as string[]) : null),
  })
  declare permissions: string[] | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @hasMany(() => User, {
    foreignKey: 'system_role_id',
  })
  declare users: HasMany<typeof User>

  // Helper methods
  isAdmin(): boolean {
    return this.name === 'superadmin' || this.name === 'system_admin'
  }

  isSuperAdmin(): boolean {
    return this.name === 'superadmin'
  }

  hasPermission(permission: string): boolean {
    if (this.permissions?.includes('*')) return true
    return this.permissions?.includes(permission) || false
  }
}
