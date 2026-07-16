import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import {
  consumeReviewObservationJson,
  consumeReviewObservationNumber,
  prepareReviewObservationJson,
} from './review_observation_json_column.js'

import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  ReviewEvidenceSufficiency,
  ReviewRationaleClassification,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'

export type {
  ReviewEvidenceSufficiency,
  ReviewRationaleClassification,
} from '#modules/reviews/actions/ports/outbound/observation/review_observation_writer'

export default class ReviewObservationRevision extends BaseModel {
  static override table = 'review_observation_revisions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare observation_id: string

  @column()
  declare observation_fact_id: string

  @column()
  declare revision_number: number

  @column()
  declare review_revision: number

  @column()
  declare schema_version: ReviewObservationV1['schemaVersion']

  @column()
  declare revision_hash: string

  @column()
  declare review_policy_version: string

  @column()
  declare capability_taxonomy_version: string | null

  @column()
  declare review_workflow_id: string

  @column()
  declare review_session_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare reviewer_type: string

  @column()
  declare reviewer_role: string

  @column()
  declare task_assignment_id: string

  @column()
  declare task_assignment_hash: string

  @column()
  declare assignment_snapshot_id: string

  @column()
  declare assignment_snapshot_hash: string

  @column()
  declare completion_report_id: string

  @column()
  declare completion_report_hash: string

  @column()
  declare completion_claim_id: string | null

  @column()
  declare completion_claim_hash: string | null

  @column()
  declare source_snapshot_id: string

  @column()
  declare source_snapshot_hash: string

  @column()
  declare task_contract_version_id: string

  @column()
  declare task_contract_hash: string

  @column()
  declare subject_user_id: string

  @column()
  declare observation_type: ReviewObservationV1['observationType']

  @column()
  declare target_ref: string

  @column()
  declare disposition: ReviewObservationV1['disposition']

  @column({
    prepare: prepareReviewObservationJson,
    consume: consumeReviewObservationJson<ReviewObservationV1['structuredValue']>,
  })
  declare structured_value: ReviewObservationV1['structuredValue']

  @column()
  declare rationale: string

  @column()
  declare rationale_classification: ReviewRationaleClassification

  @column({ consume: consumeReviewObservationNumber })
  declare confidence: number | null

  @column({ consume: consumeReviewObservationNumber })
  declare assessment_ceiling: number | null

  @column()
  declare evidence_sufficiency: ReviewEvidenceSufficiency

  @column()
  declare governance_state: ReviewObservationV1['governanceState']

  @column.dateTime()
  declare finalized_at: DateTime | null

  @column()
  declare supersedes_revision_id: string | null

  @column()
  declare supersedes_observation_id: string | null

  @column.dateTime()
  declare revoked_at: DateTime | null

  @column()
  declare revoked_by: string | null

  @column()
  declare revocation_reason: string | null

  @column()
  declare dispute_id: string | null

  @column.dateTime()
  declare dispute_frozen_at: DateTime | null

  @column({
    prepare: prepareReviewObservationJson,
    consume: consumeReviewObservationJson<TvaJsonObject>,
  })
  declare revision_payload: TvaJsonObject

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventReviewObservationRevisionMutation(): never {
    throw new InvariantViolationException(
      'Review observation revisions are immutable; append a correction instead'
    )
  }
}
