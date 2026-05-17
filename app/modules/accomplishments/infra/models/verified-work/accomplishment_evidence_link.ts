import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, prepareJsonColumn } from './json_column.js'

import type {
  TvaJsonObject,
  TvaPrivacyClassification,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class AccomplishmentEvidenceLink extends BaseModel {
  static override table = 'accomplishment_evidence_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare accomplishment_id: string

  @column()
  declare evidence_id: string

  @column()
  declare completion_claim_id: string | null

  @column()
  declare evidence_type: string

  @column()
  declare access_classification: TvaPrivacyClassification

  @column()
  declare availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'

  @column()
  declare content_hash: string | null

  @column()
  declare schema_version: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<TvaJsonObject> })
  declare evidence_payload: TvaJsonObject

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
