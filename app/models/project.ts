import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { CustomRoleDefinition } from '#types/database'
import User from './user.js'
import Organization from './organization.js'
import Task from './task.js'
import ProjectMember from './project_member.js'

export default class Project extends BaseModel {
  static override table = 'projects'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare creator_id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare organization_id: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime()
  declare start_date: DateTime | null

  @column.dateTime()
  declare end_date: DateTime | null

  /**
   * v3.0: Inline status VARCHAR — replaces status_id UUID → project_status table
   * CHECK: 'pending', 'in_progress', 'completed', 'cancelled'
   */
  @column()
  declare status: string

  @column()
  declare budget: number

  @column()
  declare manager_id: string | null

  @column()
  declare owner_id: string | null

  @column()
  declare visibility: 'public' | 'private' | 'team'

  @column()
  declare allow_freelancer: boolean

  @column()
  declare approval_required_for_members: boolean

  /**
   * v3.0: Tags JSONB (merged from project_tags)
   */
  @column({
    prepare: (value: unknown[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | unknown[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as unknown[]) : value,
  })
  declare tags: unknown[] | null

  /**
   * v3.0: Custom roles JSONB (replaces project_roles table)
   */
  @column({
    prepare: (value: CustomRoleDefinition[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CustomRoleDefinition[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as CustomRoleDefinition[]) : value,
  })
  declare custom_roles: CustomRoleDefinition[] | null

  // ===== Relationships =====

  @belongsTo(() => User, {
    foreignKey: 'creator_id',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'manager_id',
  })
  declare manager: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'owner_id',
  })
  declare owner: BelongsTo<typeof User>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Task, {
    foreignKey: 'project_id',
  })
  declare tasks: HasMany<typeof Task>

  @hasMany(() => ProjectMember, {
    foreignKey: 'project_id',
  })
  declare project_members: HasMany<typeof ProjectMember>

  @manyToMany(() => User, {
    pivotTable: 'project_members',
    pivotColumns: ['project_role'],
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  })
  declare members: ManyToMany<typeof User>
}
