import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Organization from './organization.js'
import Task from './task.js'

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

  // Mối quan hệ với status được xử lý thông qua query trực tiếp
  // vì model ProjectStatus chưa được tạo

  @hasMany(() => Task, {
    foreignKey: 'project_id',
  })
  declare tasks: HasMany<typeof Task>

  // Các mối quan hệ với ProjectAttachment và ProjectTag
  // được xử lý thông qua query trực tiếp

  @manyToMany(() => User, {
    pivotTable: 'project_members',
    pivotColumns: ['role'],
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  })
  declare members: ManyToMany<typeof User>
}
