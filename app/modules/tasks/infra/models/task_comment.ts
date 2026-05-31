import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '../../../users/infra/models/user.js'

import Task from './task.js'


export default class TaskComment extends BaseModel {
  static override table = 'task_comments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare author_id: string

  @column()
  declare parent_comment_id: string | null

  @column()
  declare body: string

  @column()
  declare comment_type: 'normal' | 'blocker' | 'clarification' | 'status_update' | 'review_note'

  @column()
  declare visibility: 'internal' | 'public' | 'reviewers_only'

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'author_id' })
  declare author: BelongsTo<typeof User>

  @belongsTo(() => TaskComment, { foreignKey: 'parent_comment_id' })
  declare parent: BelongsTo<typeof TaskComment>
}
