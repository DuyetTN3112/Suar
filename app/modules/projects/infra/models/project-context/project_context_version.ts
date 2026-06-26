import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { ProjectContextVersionV1 } from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

function prepareJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

function consumeJsonColumn(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export default class ProjectContextVersion extends BaseModel {
  static override table = 'project_context_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: ProjectContextVersionV1['schemaVersion']

  @column()
  declare organization_id: string

  @column()
  declare project_id: string

  @column()
  declare version_number: number

  @column()
  declare title: string

  @column()
  declare summary: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare rich_content: ProjectContextVersionV1['richContent']

  @column()
  declare plain_text_projection: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare structured_defaults: ProjectContextVersionV1['structuredDefaults']

  @column.dateTime()
  declare active_from: DateTime

  @column.dateTime()
  declare retired_at: DateTime | null

  @column()
  declare created_by: string

  @column()
  declare confirmed_by: string | null

  @column()
  declare change_class: ProjectContextVersionV1['changeClass']

  @column()
  declare change_reason: string | null

  @column()
  declare privacy_classification: ProjectContextVersionV1['privacyClassification']

  @column()
  declare content_hash: ProjectContextVersionV1['contentHash']

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare source_provenance: ProjectContextVersionV1['sourceProvenance']

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventProjectContextVersionMutation(): never {
    throw new InvariantViolationException(
      'Project Context versions are immutable; create a new version instead'
    )
  }
}
