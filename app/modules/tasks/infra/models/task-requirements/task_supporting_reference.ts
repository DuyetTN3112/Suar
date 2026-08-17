import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskSupportingReferenceV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export default class TaskSupportingReference extends BaseModel {
  static override table = 'task_supporting_references'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare reference_id: string

  @column()
  declare task_id: string

  @column()
  declare task_specification_version_id: string

  @column()
  declare type: TaskSupportingReferenceV1['type']

  @column()
  declare uri: string

  @column()
  declare uri_hash: TvaSha256

  @column()
  declare title: string

  @column()
  declare relevant_section: string

  @column()
  declare relation: TaskSupportingReferenceV1['relation']

  @column()
  declare access_state: TaskSupportingReferenceV1['accessState']

  @column()
  declare privacy_classification: TaskSupportingReferenceV1['privacyClassification']

  @column()
  declare external_version: string | null

  @column()
  declare external_content_hash: TvaSha256 | null

  @column()
  declare added_by: string

  @column.dateTime()
  declare added_at: DateTime

  @column()
  declare reference_fingerprint: TvaSha256

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskSupportingReferenceMutation(): never {
    throw new InvariantViolationException(
      'Task Supporting References are immutable within a Specification version'
    )
  }
}
