import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import {
  consumeTaskCompletionJsonColumn,
  prepareTaskCompletionJsonColumn,
  rejectTaskCompletionRecordMutation,
} from './task_completion_model_hooks.js'

import type {
  TvaAutonomyLevel,
  TvaClaimStatus,
  TvaJsonObject,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class TaskCompletionContributorClaim extends BaseModel {
  static override table = 'task_completion_contributor_claims'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare contract_version: 1

  @column()
  declare schema_version: 'suar.completion_claim.v1'

  @column()
  declare completion_report_id: string

  @column()
  declare completion_report_revision: number

  @column()
  declare completion_report_hash: TvaSha256

  @column()
  declare assignment_snapshot_id: string

  @column()
  declare task_contract_version_id: string

  @column()
  declare contributor_user_id: string

  @column()
  declare action: string

  @column()
  declare object: string

  @column()
  declare proposed_title: string

  @column()
  declare proposed_statement: string

  @column()
  declare actual_role: string

  @column()
  declare actual_ownership: TvaOwnershipLevel

  @column()
  declare actual_autonomy: TvaAutonomyLevel | null

  @column()
  declare contribution_statement: string

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare deliverable_refs: readonly string[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare criterion_result_refs: readonly string[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare evidence_refs: readonly string[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<TvaJsonObject>,
  })
  declare outcome_data: TvaJsonObject

  @column()
  declare public_claim_draft: string | null

  @column()
  declare privacy_classification: TvaPrivacyClassification

  @column()
  declare claim_status: TvaClaimStatus

  @column()
  declare claim_hash: TvaSha256

  @column()
  declare idempotency_key: string

  @column()
  declare supersedes_claim_id: string | null

  @column()
  declare correction_reason: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskCompletionContributorClaimMutation(): never {
    return rejectTaskCompletionRecordMutation('Task Completion Contributor Claim')
  }
}
