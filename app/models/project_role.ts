import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import ProjectMember from './project_member.js'

export default class ProjectRole extends BaseModel {
  static table = 'project_roles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number | null

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column({
    prepare: (value: string[]) => JSON.stringify(value),
    consume: (value: string) => (value ? JSON.parse(value) : []),
  })
  declare permissions: string[]

  @column()
  declare is_custom: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @hasMany(() => ProjectMember, {
    foreignKey: 'project_role_id',
  })
  declare project_members: HasMany<typeof ProjectMember>

  // Helper methods
  hasPermission(permission: string): boolean {
    return this.permissions?.includes(permission) || false
  }
}
