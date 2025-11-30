import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Organization from './organization.js'
import Task from './task.js'
import ProjectRole from './project_role.js'
import ProjectMember from './project_member.js'

export default class Project extends BaseModel {
  static table = 'projects'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare creator_id: number

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare organization_id: number

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

  @column()
  declare status_id: number | null

  @column()
  declare budget: number

  @column()
  declare manager_id: number | null

  @column()
  declare owner_id: number | null

  @column()
  declare visibility: 'public' | 'private' | 'team'

  @column()
  declare allow_freelancer: boolean

  @column()
  declare approval_required_for_members: boolean

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

  @hasMany(() => ProjectRole, {
    foreignKey: 'project_id',
  })
  declare roles: HasMany<typeof ProjectRole>

  @hasMany(() => ProjectMember, {
    foreignKey: 'project_id',
  })
  declare project_members: HasMany<typeof ProjectMember>

  @manyToMany(() => User, {
    pivotTable: 'project_members',
    pivotColumns: ['project_role_id'],
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  })
  declare members: ManyToMany<typeof User>
}
