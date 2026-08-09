import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskReadinessResultV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  consumeTaskContractJson,
  prepareTaskContractJson,
} from '#modules/tasks/infra/models/task-authoring/task_contract_json_column'

export default class TaskReadinessAssessment extends BaseModel {
  static override table = 'task_readiness_assessments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare task_id: string

  @column()
  declare task_specification_version_id: string

  @column()
  declare task_contract_version_id: string | null

  @column()
  declare policy_version: string

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare assessment_input: TvaJsonObject

  @column()
  declare input_hash: TvaSha256

  @column()
  declare work_state: TaskReadinessResultV1['workState']

  @column()
  declare evidence_state: TaskReadinessResultV1['evidenceState']

  @column()
  declare assignment_ready: boolean

  @column()
  declare evidence_ready: boolean

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare blockers: TaskReadinessResultV1['blockers']

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare warnings: TaskReadinessResultV1['warnings']

  @column()
  declare result_hash: TvaSha256

  @column.dateTime()
  declare assessed_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskReadinessAssessmentMutation(): never {
    throw new InvariantViolationException(
      'Task Readiness Assessments are immutable audit records; append a new assessment instead'
    )
  }
}
