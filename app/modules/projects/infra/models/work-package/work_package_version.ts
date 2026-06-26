import { BaseModel, beforeUpdate, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { WorkPackageVersionV1 } from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
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

export default class WorkPackageVersion extends BaseModel {
  static override table = 'work_package_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: WorkPackageVersionV1['schemaVersion']

  @column()
  declare work_package_id: string

  @column()
  declare project_id: string

  @column()
  declare project_context_version_id: string | null

  @column()
  declare version_number: number

  @column()
  declare title: string

  @column()
  declare summary: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare rich_content: WorkPackageVersionV1['richContent']

  @column()
  declare plain_text_projection: string

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare structured_overrides: WorkPackageVersionV1['structuredOverrides']

  @column()
  declare author_id: string

  @column()
  declare confirmed_by: string | null

  @column()
  declare change_class: WorkPackageVersionV1['changeClass']

  @column()
  declare change_reason: string | null

  @column()
  declare privacy_classification: WorkPackageVersionV1['privacyClassification']

  @column()
  declare content_hash: WorkPackageVersionV1['contentHash']

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare source_provenance: WorkPackageVersionV1['sourceProvenance']

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @beforeUpdate()
  static preventWorkPackageVersionMutation(): never {
    throw new InvariantViolationException(
      'Work Package versions are immutable; create a new version instead'
    )
  }
}
