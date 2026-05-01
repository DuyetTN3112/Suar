import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, prepareJsonColumn } from '../verified-work/json_column.js'

import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { AccomplishmentLifecycleStateV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

export default class AccomplishmentLifecycleRevision extends BaseModel {
  static override table = 'accomplishment_lifecycle_revisions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare contract_version: 1

  @column()
  declare schema_version: string

  @column()
  declare accomplishment_id: string

  @column()
  declare sequence: number

  @column()
  declare previous_state: AccomplishmentLifecycleStateV1 | null

  @column()
  declare next_state: AccomplishmentLifecycleStateV1

  @column()
  declare visibility: 'private' | 'internal' | 'public'

  @column()
  declare reason_code: AccomplishmentLifecycleRevisionV1['reasonCode']

  @column()
  declare source_fact_id: string

  @column()
  declare source_fact_type: AccomplishmentLifecycleRevisionV1['sourceFact']['type']

  @column()
  declare source_fact_hash: string

  @column()
  declare actor_type: AccomplishmentLifecycleRevisionV1['actor']['type']

  @column()
  declare actor_user_id: string | null

  @column()
  declare policy_version: string

  @column()
  declare supersedes_revision_id: string | null

  @column()
  declare related_accomplishment_id: string | null

  @column({
    prepare: prepareJsonColumn,
    consume: consumeJsonColumn<AccomplishmentLifecycleRevisionV1>,
  })
  declare revision_payload: AccomplishmentLifecycleRevisionV1

  @column.dateTime()
  declare occurred_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
