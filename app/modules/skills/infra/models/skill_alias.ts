import { BaseModel, column, belongsTo, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Skill from './skill.js'

export default class SkillAlias extends BaseModel {
  static override table = 'skill_aliases'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare skill_id: string

  @column()
  declare alias: string

  @column()
  declare normalized_alias: string

  @column()
  declare locale: string

  @column()
  declare source: string

  @column()
  declare is_primary: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Skill, {
    foreignKey: 'skill_id',
  })
  declare skill: BelongsTo<typeof Skill>

  @beforeSave()
  static normalizeAliasInstance(aliasInstance: SkillAlias) {
    if (aliasInstance.alias) {
      aliasInstance.normalized_alias = aliasInstance.alias
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '')
    }
  }
}
