import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from '../../../users/infra/models/user.js'

import Task from './task.js'
import TaskAssignment from './task_assignment.js'
import TaskSubmissionEvidence from './task_submission_evidence.js'


export default class TaskSubmission extends BaseModel {
  static override table = 'task_submissions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare task_id: string

  @column()
  declare submitted_by: string

  @column()
  declare summary: string

  @column()
  declare implementation_notes: string | null

  @column()
  declare known_limitations: string | null

  @column()
  declare test_notes: string | null

  @column()
  declare demo_url: string | null

  @column()
  declare repository_url: string | null

  @column()
  declare pull_request_url: string | null

  @column()
  declare status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'

  @column.dateTime()
  declare submitted_at: DateTime | null

  @column.dateTime()
  declare locked_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => TaskAssignment, { foreignKey: 'task_assignment_id' })
  declare assignment: BelongsTo<typeof TaskAssignment>

  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'submitted_by' })
  declare submitter: BelongsTo<typeof User>

  @hasMany(() => TaskSubmissionEvidence, { foreignKey: 'submission_id' })
  declare evidences: HasMany<typeof TaskSubmissionEvidence>
}
