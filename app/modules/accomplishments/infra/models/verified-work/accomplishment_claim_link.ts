import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, prepareJsonColumn } from './json_column.js'

import type {
  TvaClaimStatus,
  TvaJsonObject,
  TvaOwnershipLevel,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class AccomplishmentClaimLink extends BaseModel {
  static override table = 'accomplishment_claim_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare accomplishment_id: string

  @column()
  declare completion_claim_id: string

  @column()
  declare subject_user_id: string

  @column()
  declare claim_status: TvaClaimStatus

  @column()
  declare ownership_level: TvaOwnershipLevel

  @column()
  declare source_claim_hash: string

  @column()
  declare schema_version: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<TvaJsonObject> })
  declare claim_payload: TvaJsonObject

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
