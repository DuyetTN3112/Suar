import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import User from './user.js'

export default class ProjectMember extends BaseModel {
  static table = 'project_members'
  static primaryKey = 'id'
  static selfAssignPrimaryKey = false

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare user_id: number

  @column()
  declare role: 'owner' | 'manager' | 'member'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
