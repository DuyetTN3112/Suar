import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

import type { WorkPackageV1 } from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export default class WorkPackage extends BaseModel {
  static override table = 'work_packages'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare schema_version: WorkPackageV1['schemaVersion']

  @column()
  declare organization_id: string

  @column()
  declare project_id: string

  @column()
  declare key: string

  @column()
  declare title: string

  @column()
  declare summary: string

  @column()
  declare state: WorkPackageV1['state']

  @column()
  declare active_version_id: string | null

  @column()
  declare created_by: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare archived_at: DateTime | null
}
