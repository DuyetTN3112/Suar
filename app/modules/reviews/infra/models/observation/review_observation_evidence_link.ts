import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TvaPrivacyClassification } from '#modules/tasks/public_contracts/task-authoring/primitives'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export default class ReviewObservationEvidenceLink extends BaseModel {
  static override table = 'review_observation_evidence_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare observation_revision_id: string

  @column()
  declare evidence_id: string

  @column()
  declare relation: 'supports' | 'contradicts' | 'context'

  @column()
  declare access_classification: TvaPrivacyClassification

  @column()
  declare reviewer_access_state: 'available' | 'restricted' | 'unavailable' | 'unknown'

  @column()
  declare evidence_hash: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventReviewObservationEvidenceLinkMutation(): never {
    throw new InvariantViolationException(
      'Review observation evidence links are immutable; append a new observation revision instead'
    )
  }
}
