import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { TaskSpecificationVersionV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  consumeTaskContractJson,
  prepareTaskContractJson,
} from '#modules/tasks/infra/models/task-authoring/task_contract_json_column'

export default class TaskSpecificationVersion extends BaseModel {
  static override table = 'task_specification_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: TaskSpecificationVersionV1['schemaVersion']

  @column()
  declare task_id: string

  @column()
  declare version_number: number

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare rich_content: TaskSpecificationVersionV1['richContent']

  @column()
  declare plain_text_projection: string

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare section_index: TaskSpecificationVersionV1['sectionIndex']

  @column()
  declare project_context_version_id: string | null

  @column()
  declare work_package_version_id: string | null

  @column()
  declare author_id: string

  @column()
  declare confirmation_state: TaskSpecificationVersionV1['confirmationState']

  @column()
  declare content_hash: TaskSpecificationVersionV1['contentHash']

  @column()
  declare change_class: TaskSpecificationVersionV1['changeClass']

  @column()
  declare change_reason: string | null

  @column({ prepare: prepareTaskContractJson, consume: consumeTaskContractJson })
  declare source_provenance: TaskSpecificationVersionV1['sourceProvenance']

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventTaskSpecificationVersionMutation(): never {
    throw new InvariantViolationException(
      'Task Specification versions are immutable; create a new version instead'
    )
  }
}
