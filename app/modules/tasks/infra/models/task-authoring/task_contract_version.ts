import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TaskContractVersionV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskWorkContractResolutionResult } from '#modules/tasks/domain/task-authoring/task_contract_resolution'
import {
  consumeTaskContractJson,
  prepareTaskContractJson,
} from '#modules/tasks/infra/models/task-authoring/task_contract_json_column'

export default class TaskContractVersion extends BaseModel {
  static override table = 'task_contract_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: TaskContractVersionV1['schemaVersion']

  @column()
  declare task_id: string

  @column()
  declare task_specification_version_id: string

  @column()
  declare version_number: number

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare work_contract: TaskContractVersionV1['workContract']

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare evidence_contract: TaskContractVersionV1['evidenceContract']

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare resolved_contract: TaskContractVersionV1['resolvedContract']

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare resolution_provenance: TaskWorkContractResolutionResult['provenance']

  @column()
  declare readiness_state: TaskContractVersionV1['readinessState']

  @column()
  declare creator_confirmed_by: string | null

  @column.dateTime()
  declare creator_confirmed_at: DateTime | null

  @column()
  declare content_hash: TaskContractVersionV1['contentHash']

  @column()
  declare change_class: TaskContractVersionV1['changeClass']

  @column()
  declare change_reason: string | null

  @column.dateTime()
  declare effective_from: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskContractVersionMutation(): never {
    throw new InvariantViolationException(
      'Task Contract versions are immutable; create a new version instead'
    )
  }
}
