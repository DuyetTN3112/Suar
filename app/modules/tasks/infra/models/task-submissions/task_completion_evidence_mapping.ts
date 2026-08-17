import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { rejectTaskCompletionRecordMutation } from './task_completion_model_hooks.js'

export default class TaskCompletionEvidenceMapping extends BaseModel {
  static override table = 'task_completion_evidence_mappings'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: 'suar.task_completion_evidence_mapping.v1'

  @column()
  declare completion_report_id: string

  @column()
  declare evidence_item_id: string

  @column()
  declare criterion_result_id: string | null

  @column()
  declare contributor_claim_id: string | null

  @column()
  declare mapping_purpose: 'completion_proof' | 'attribution' | 'validation' | 'context'

  @column()
  declare attribution_statement: string | null

  @column()
  declare created_by: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskCompletionEvidenceMappingMutation(): never {
    return rejectTaskCompletionRecordMutation('Task Completion Evidence Mapping')
  }
}
