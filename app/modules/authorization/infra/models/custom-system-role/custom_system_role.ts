import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

function parseJsonColumn<T>(value: string | T | null): T | null {
  if (typeof value !== 'string') return value
  return JSON.parse(value) as T
}

export default class CustomSystemRole extends BaseModel {
  static override table = 'custom_system_roles'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare code: string

  @column()
  declare description: string | null

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | string[] | null) => parseJsonColumn<string[]>(value) || [],
  })
  declare permissions: string[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
