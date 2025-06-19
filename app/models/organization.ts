import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { CustomRoleDefinition } from '#types/database'
import User from './user.js'
import Task from './task.js'
import Project from './project.js'
import type { ManyToMany, HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Organization extends BaseModel {
  static override table = 'organizations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare logo: string | null

  @column()
  declare website: string | null

  @column()
  declare plan: string | null

  @column()
  declare owner_id: string

  // v3: custom_roles JSONB — custom role definitions for this org
  @column({
    prepare: (value: CustomRoleDefinition[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CustomRoleDefinition[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as CustomRoleDefinition[]) : (value ?? null),
  })
  declare custom_roles: CustomRoleDefinition[] | null

  // v3: partner_* columns merged from verified_partners table
  @column()
  declare partner_type: string | null

  @column.dateTime()
  declare partner_verified_at: DateTime | null

  @column()
  declare partner_verified_by: string | null

  @column()
  declare partner_verification_proof: string | null

  @column.dateTime()
  declare partner_expires_at: DateTime | null

  @column()
  declare partner_is_active: boolean | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @manyToMany(() => User, {
    pivotTable: 'organization_users',
    pivotColumns: ['org_role'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'owner_id',
  })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>

  @hasMany(() => Project, {
    foreignKey: 'organization_id',
  })
  declare projects: HasMany<typeof Project>
}
