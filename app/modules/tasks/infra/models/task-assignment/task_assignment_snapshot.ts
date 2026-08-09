import { BaseModel, beforeUpdate, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Task from '../task-authoring/task.js'
import TaskAssignment from '../task-assignment/task_assignment.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'

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

  @column()
  declare schema_version: CanonicalTaskAssignmentContractSnapshotV1['schemaVersion'] | null

  @column()
  declare task_specification_version_id: string | null

  @column()
  declare task_contract_version_id: string | null

  @column()
  declare snapshot_sequence: number | null

  @column()
  declare previous_snapshot_id: string | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare canonical_snapshot: CanonicalTaskAssignmentContractSnapshotV1 | null

  @column()
  declare snapshot_hash: `sha256:${string}` | null

  @column()
  declare acknowledgement_required: boolean | null

  @column()
  declare idempotency_key: string | null

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

  @beforeUpdate()
  static preventSnapshotMutation(): never {
    throw new InvariantViolationException(
      'Task assignment snapshots are immutable; create a governed successor snapshot'
    )
  }
}
