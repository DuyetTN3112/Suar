import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import User from './user.js'

export default class ProjectAttachment extends BaseModel {
  static table = 'project_attachments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare project_id: number

  @column()
  declare file_name: string

  @column()
  declare file_path: string

  @column()
  declare uploaded_by: number | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => User, {
    foreignKey: 'uploaded_by',
  })
  declare uploader: BelongsTo<typeof User>
}
