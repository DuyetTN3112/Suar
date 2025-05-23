import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import User from './user.js'
import Task from './task.js'
import Project from './project.js'
import type { ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'

export default class Organization extends BaseModel {
  static table = 'organizations'

  @column({ isPrimary: true })
  declare id: number

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
  declare owner_id: number

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @manyToMany(() => User, {
    pivotTable: 'organization_users',
    pivotColumns: ['role_id'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>

  @hasMany(() => Project)
  declare projects: HasMany<typeof Project>
}
