import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import { consumeJsonColumn, prepareJsonColumn } from './json_column.js'

import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'

export default class AccomplishmentReviewObservationLink extends BaseModel {
  static override table = 'accomplishment_review_observation_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare accomplishment_id: string

  @column()
  declare review_observation_id: string

  @column()
  declare observation_revision_id: string

  @column()
  declare observation_fact_id: string

  @column()
  declare observation_type: ReviewObservationV1['observationType']

  @column()
  declare disposition: ReviewObservationV1['disposition']

  @column()
  declare governance_state: ReviewObservationV1['governanceState']

  @column()
  declare source_observation_hash: string

  @column()
  declare schema_version: 'suar.accomplishment_review_observation_link.v1'

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn<TvaJsonObject> })
  declare link_payload: TvaJsonObject

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
