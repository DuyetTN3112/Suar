import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '../../../users/infra/models/user.js'

import Task from './task.js'


export default class TaskAttachment extends BaseModel {
  static override table = 'task_attachments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare file_name: string

  @column()
  declare file_path: string

  @column()
  declare file_size: number | null

  @column()
  declare mime_type: string | null

  @column()
  declare uploaded_by: string

  @column()
  declare attachment_type: 'requirement' | 'reference' | 'submission' | 'review' | 'other'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'uploaded_by' })
  declare uploader: BelongsTo<typeof User>
}
