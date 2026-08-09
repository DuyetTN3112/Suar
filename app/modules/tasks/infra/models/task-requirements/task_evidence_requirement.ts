import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TaskEvidenceRequirementV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  consumeTaskContractJson,
  prepareTaskContractJson,
} from '#modules/tasks/infra/models/task-authoring/task_contract_json_column'

export default class TaskEvidenceRequirement extends BaseModel {
  static override table = 'task_evidence_requirements'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare evidence_requirement_id: string

  @column()
  declare task_id: string

  @column()
  declare task_contract_version_id: string

  @column()
  declare type: string

  @column()
  declare title: string

  @column()
  declare description: string

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare criterion_ids: TaskEvidenceRequirementV1['criterionIds']

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare deliverable_ids: TaskEvidenceRequirementV1['deliverableIds']

  @column()
  declare required: boolean

  @column()
  declare privacy_classification: TaskEvidenceRequirementV1['privacyClassification']

  @column()
  declare ordinal: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskEvidenceRequirementMutation(): never {
    throw new InvariantViolationException(
      'Task Evidence Requirements are immutable within a Contract version'
    )
  }
}
