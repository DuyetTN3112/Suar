import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, prepareJsonColumn } from '../verified-work/json_column.js'

import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import type {
  TvaAutonomyLevel,
  TvaCollaborationType,
  TvaOwnershipLevel,
  TvaProvenanceClass,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class AccomplishmentPublicProjection extends BaseModel {
  static override table = 'accomplishment_public_projections'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare projection_key: string

  @column()
  declare contract_version: 1

  @column()
  declare schema_version: string

  @column()
  declare disclosure_policy_version: string

  @column()
  declare accomplishment_id: string

  @column()
  declare user_id: string

  @column()
  declare publication_version: number

  @column()
  declare source_lifecycle_revision_id: string

  @column()
  declare source_canonical_hash: string

  @column()
  declare title: string

  @column()
  declare concise_statement: string

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
  declare verification_status: 'verified' | 'partially_verified'

  @column()
  declare confidence_band: 'low' | 'medium' | 'high'

  @column()
  declare provenance_class: TvaProvenanceClass

  @column()
  declare evidence_availability:
    | 'available'
    | 'partially_available'
    | 'unavailable'
    | 'not_disclosed'

  @column()
  declare redaction_state: 'not_required' | 'redacted' | 'generalized'

  @column({
    prepare: prepareJsonColumn,
    consume: consumeJsonColumn<AccomplishmentPublicProjectionV1>,
  })
  declare public_payload: AccomplishmentPublicProjectionV1

  @column.dateTime()
  declare published_at: DateTime

  @column.dateTime()
  declare source_updated_at: DateTime

  @column.dateTime()
  declare retired_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
