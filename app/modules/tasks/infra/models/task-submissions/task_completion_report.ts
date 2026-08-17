import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import {
  consumeTaskCompletionJsonColumn,
  prepareTaskCompletionJsonColumn,
  rejectTaskCompletionRecordMutation,
} from './task_completion_model_hooks.js'

import type {
  TvaAutonomyLevel,
  TvaJsonObject,
  TvaJsonValue,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class TaskCompletionReport extends BaseModel {
  static override table = 'task_completion_reports'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare contract_version: 1

  @column()
  declare schema_version: 'suar.task_completion_report.v1'

  @column()
  declare task_submission_id: string

  @column()
  declare task_id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare assignment_snapshot_id: string

  @column()
  declare task_contract_version_id: string

  @column()
  declare revision: number

  @column()
  declare idempotency_key: string

  @column()
  declare supersedes_report_id: string | null

  @column()
  declare correction_reason: string | null

  @column()
  declare report_status: 'draft' | 'submitted' | 'locked' | 'superseded' | 'cancelled'

  @column()
  declare work_performed: string

  @column()
  declare contribution_statement: string

  @column()
  declare actual_role: string

  @column()
  declare actual_ownership: TvaOwnershipLevel

  @column()
  declare actual_autonomy: TvaAutonomyLevel | null

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare key_decisions: readonly TvaJsonValue[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare deliverables_manifest: readonly TvaJsonValue[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare deviations: readonly TvaJsonValue[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<TvaJsonObject>,
  })
  declare actual_outcomes: TvaJsonObject

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<TvaJsonObject>,
  })
  declare impact_observed: TvaJsonObject

  @column()
  declare limitations: string | null

  @column()
  declare remaining_work: string | null

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare collaborators: readonly TvaJsonValue[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly TvaJsonValue[]>,
  })
  declare validation_outcomes: readonly TvaJsonValue[]

  @column()
  declare public_claim_draft: string | null

  @column()
  declare privacy_classification: TvaPrivacyClassification

  @column()
  declare assignment_snapshot_hash: TvaSha256

  @column()
  declare task_contract_hash: TvaSha256

  @column()
  declare completion_report_hash: TvaSha256

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<TvaJsonObject>,
  })
  declare canonical_payload: TvaJsonObject

  @column()
  declare created_by: string

  @column.dateTime()
  declare reported_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskCompletionReportMutation(): never {
    return rejectTaskCompletionRecordMutation('Task Completion Report')
  }
}
