import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Task from './task.js'
import TaskAssignment from './task_assignment.js'

function prepareJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') return value
  return JSON.stringify(value)
}

function consumeJsonColumn(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export default class TaskAssignmentSnapshot extends BaseModel {
  static override table = 'task_assignment_snapshots'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare task_id: string

  @column()
  declare snapshot_reason: 'assigned' | 'submitted' | 'review_started' | 'disputed'

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare task_snapshot: Record<string, unknown>

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare required_skills_snapshot: Record<string, unknown>[]

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare acceptance_criteria_snapshot: Record<string, unknown>

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare workflow_snapshot: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => TaskAssignment, { foreignKey: 'task_assignment_id' })
  declare assignment: BelongsTo<typeof TaskAssignment>

  @belongsTo(() => Task, { foreignKey: 'task_id' })
  declare task: BelongsTo<typeof Task>
}
