import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import {
  consumeTaskCompletionJsonColumn,
  prepareTaskCompletionJsonColumn,
  rejectTaskCompletionRecordMutation,
} from './task_completion_model_hooks.js'

import type {
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class TaskCompletionEvidenceManifestItem extends BaseModel {
  static override table = 'task_completion_evidence_manifest'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: 'suar.task_completion_evidence_manifest_item.v1'

  @column()
  declare completion_report_id: string

  @column()
  declare idempotency_key: string

  @column()
  declare evidence_type: string

  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare uri: string | null

  @column()
  declare storage_reference: string | null

  @column()
  declare version_reference: string | null

  @column()
  declare content_hash: TvaSha256 | null

  @column()
  declare manifest_hash: TvaSha256

  @column.dateTime()
  declare captured_at: DateTime | null

  @column()
  declare owner_user_id: string

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare contributor_user_ids: readonly string[]

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare evidence_requirement_ids: readonly string[]

  @column()
  declare related_deliverable_id: string | null

  @column({
    prepare: prepareTaskCompletionJsonColumn,
    consume: consumeTaskCompletionJsonColumn<readonly string[]>,
  })
  declare related_deliverable_ids: readonly string[]

  @column()
  declare access_classification: TvaPrivacyClassification

  @column()
  declare reviewer_access_state: 'available' | 'restricted' | 'unavailable' | 'unknown'

  @column()
  declare availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'

  @column()
  declare availability_reason:
    | 'none'
    | 'expired'
    | 'deleted'
    | 'restricted'
    | 'quarantined'
    | 'unknown'

  @column()
  declare retention_state: 'retained' | 'expiring' | 'tombstoned' | 'purged'

  @column.dateTime()
  declare availability_checked_at: DateTime | null

  @column.dateTime()
  declare tombstoned_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskCompletionEvidenceManifestMutation(): never {
    return rejectTaskCompletionRecordMutation('Task Completion Evidence Manifest')
  }
}
