import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import User from './user.js'

export default class ProjectAttachment extends BaseModel {
  static override table = 'project_attachments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare project_id: string

  @column()
  declare file_name: string

  @column()
  declare file_path: string

  @column()
  declare uploaded_by: string | null

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
