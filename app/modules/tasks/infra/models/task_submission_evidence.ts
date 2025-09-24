import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '../../../users/infra/models/user.js'

import TaskSubmission from './task_submission.js'


export default class TaskSubmissionEvidence extends BaseModel {
  static override table = 'task_submission_evidences'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare submission_id: string

  @column()
  declare evidence_type:
    | 'pull_request'
    | 'commit_link'
    | 'demo_recording'
    | 'test_report'
    | 'document_link'
    | 'screenshot'
    | 'metrics_screenshot'
    | 'deployment_link'
    | 'other'

  @column()
  declare url: string

  @column()
  declare title: string | null

  @column()
  declare description: string | null

  @column()
  declare uploaded_by: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => TaskSubmission, { foreignKey: 'submission_id' })
  declare submission: BelongsTo<typeof TaskSubmission>

  @belongsTo(() => User, { foreignKey: 'uploaded_by' })
  declare uploader: BelongsTo<typeof User>
}
