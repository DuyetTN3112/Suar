import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class TaskAuthoringHead extends BaseModel {
  static override table = 'task_authoring_heads'

  @column({ isPrimary: true })
  declare task_id: string

  @column()
  declare current_specification_version_id: string

  @column()
  declare current_contract_version_id: string | null

  @column()
  declare revision: number

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
}
