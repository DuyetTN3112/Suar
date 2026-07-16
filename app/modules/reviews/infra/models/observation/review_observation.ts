import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'

export default class ReviewObservation extends BaseModel {
  static override table = 'review_observations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare idempotency_key: string

  @column()
  declare schema_version: ReviewObservationV1['schemaVersion']

  @column()
  declare review_workflow_id: string

  @column()
  declare review_session_id: string

  @column()
  declare task_assignment_id: string

  @column()
  declare completion_report_id: string

  @column()
  declare completion_claim_id: string | null

  @column()
  declare subject_user_id: string

  @column()
  declare observation_type: ReviewObservationV1['observationType']

  @column()
  declare target_ref: string

  @column()
  declare current_revision_number: number

  @column()
  declare governance_state: ReviewObservationV1['governanceState']

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
