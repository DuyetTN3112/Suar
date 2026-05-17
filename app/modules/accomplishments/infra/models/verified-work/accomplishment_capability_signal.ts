import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, consumeNullableNumber, prepareJsonColumn } from './json_column.js'

import type { AccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { TvaOwnershipLevel } from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class AccomplishmentCapabilitySignal extends BaseModel {
  static override table = 'accomplishment_capability_signals'

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
  declare accomplishment_id: string

  @column()
  declare subject_user_id: string

  @column()
  declare capability_id: string

  @column()
  declare observed_behaviour: string

  @column()
  declare observed_level_code: string | null

  @column()
  declare assessment_ceiling_code: string | null

  @column()
  declare direction: 'positive' | 'negative' | 'neutral'

  @column()
  declare applicability: 'direct' | 'supporting' | 'contextual'

  @column()
  declare action: string

  @column()
  declare object: string

  @column()
  declare ownership_level: TvaOwnershipLevel

  @column()
  declare complexity_summary: string | null

  @column({ consume: consumeNullableNumber })
  declare confidence_score: number | null

  @column()
  declare confidence_band: 'low' | 'medium' | 'high'

  @column()
  declare signal_state: 'active' | 'frozen' | 'superseded' | 'revoked'

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<string[]> })
  declare evidence_reference_ids: string[]

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<string[]> })
  declare review_observation_ids: string[]

  @column()
  declare source_observation_hash: string

  @column({
    prepare: prepareJsonColumn,
    consume: consumeJsonColumn<AccomplishmentCapabilitySignalV1>,
  })
  declare signal_payload: AccomplishmentCapabilitySignalV1

  @column.dateTime()
  declare observed_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
