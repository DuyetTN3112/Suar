import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import Skill from './skill.js'
import SkillRubricLevel from './skill_rubric_level.js'

export default class SkillRubricVersion extends BaseModel {
  static override table = 'skill_rubric_versions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare skill_id: string

  @column()
  declare version: number

  @column()
  declare status: 'draft' | 'published'

  @column.dateTime()
  declare effective_from: DateTime | null

  @column.dateTime()
  declare effective_to: DateTime | null

  @column()
  declare created_by: string | null

  @column()
  declare change_summary: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Skill, {
    foreignKey: 'skill_id',
  })
  declare skill: BelongsTo<typeof Skill>

  @hasMany(() => SkillRubricLevel, {
    foreignKey: 'rubric_version_id',
  })
  declare levels: HasMany<typeof SkillRubricLevel>
}
