import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import {
  consumeTaskCompletionJsonColumn,
  prepareTaskCompletionJsonColumn,
  rejectTaskCompletionRecordMutation,
} from './task_completion_model_hooks.js'

import type {
  TvaCriterionResult,
  TvaJsonValue,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class TaskCompletionCriterionResult extends BaseModel {
  static override table = 'task_completion_criterion_results'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: 'suar.task_completion_criterion_result.v1'

  @column()
  declare completion_report_id: string

  @column()
  declare criterion_id: string

  @column()
  declare expected_outcome: string

  @column()
  declare actual_outcome: string

  @column()
  declare result: TvaCriterionResult

  @column()
  declare explanation: string

  @column()
  declare deviation_status: 'none' | 'reported' | 'approved' | 'governed_exception'

  @column()
  declare deviation_summary: string | null

  @column()
  declare deviation_approval_ref: string | null

  @column()
  declare not_applicable_reason: string | null

  @column()
  declare not_applicable_policy_ref: string | null

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare validation_outcomes: readonly TvaJsonValue[]

  @column()
  declare result_hash: TvaSha256

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskCompletionCriterionResultMutation(): never {
    return rejectTaskCompletionRecordMutation('Task Completion Criterion Result')
  }
}
