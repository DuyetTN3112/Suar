import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, consumeNullableNumber, prepareJsonColumn } from './json_column.js'

import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type {
  TvaAutonomyLevel,
  TvaCollaborationType,
  TvaOwnershipLevel,
  TvaProvenanceClass,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class VerifiedWorkAccomplishment extends BaseModel {
  static override table = 'verified_work_accomplishments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare projection_key: string

  @column()
  declare contract_version: 1

  @column()
  declare schema_version: string

  @column()
  declare policy_version: string

  @column()
  declare user_id: string

  @column()
  declare organization_id: string | null

  @column()
  declare project_id: string | null

  @column()
  declare task_id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare title: string

  @column()
  declare concise_statement: string

  @column()
  declare detailed_statement: string | null

  @column()
  declare action: string

  @column()
  declare object: string

  @column()
  declare task_type: string | null

  @column()
  declare business_domain: string | null

  @column()
  declare problem_category: string | null

  @column()
  declare role: string | null

  @column()
  declare ownership_level: TvaOwnershipLevel

  @column()
  declare autonomy_level: TvaAutonomyLevel | null

  @column()
  declare collaboration_type: TvaCollaborationType | null

  @column()
  declare environment: string | null

  @column()
  declare system_area: string | null

  @column()
  declare scale_summary: string | null

  @column()
  declare verification_method: string

  @column({ consume: consumeNullableNumber })
  declare confidence_score: number | null

  @column()
  declare confidence_band: 'low' | 'medium' | 'high'

  @column()
  declare evidence_sufficiency: 'pending' | 'adequate' | 'governed_exception' | 'inadequate'

  @column()
  declare lifecycle_state:
    | 'candidate'
    | 'under_review'
    | 'verified'
    | 'partially_verified'
    | 'frozen'
    | 'superseded'
    | 'revoked'

  @column()
  declare visibility: 'private' | 'internal' | 'public'

  @column()
  declare provenance_class: TvaProvenanceClass

  @column()
  declare project_context_version_id: string | null

  @column()
  declare work_package_version_id: string | null

  @column()
  declare task_specification_version_id: string

  @column()
  declare task_contract_version_id: string

  @column()
  declare assignment_snapshot_id: string

  @column()
  declare completion_report_id: string

  @column()
  declare review_workflow_id: string

  @column()
  declare task_specification_hash: string

  @column()
  declare task_contract_hash: string

  @column()
  declare assignment_snapshot_hash: string

  @column()
  declare completion_report_hash: string

  @column()
  declare review_hash: string | null

  @column()
  declare canonical_hash: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<VerifiedWorkAccomplishmentV1> })
  declare canonical_payload: VerifiedWorkAccomplishmentV1

  @column.dateTime()
  declare verified_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
