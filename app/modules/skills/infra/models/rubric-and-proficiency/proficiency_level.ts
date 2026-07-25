import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProficiencyScale from './proficiency_scale.js'
import SkillRubricLevel from './skill_rubric_level.js'

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

export default class ProficiencyLevel extends BaseModel {
  static override table = 'proficiency_levels'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare scale_id: string

  @column()
  declare ordinal: number

  @column()
  declare code: string

  @column()
  declare display_name: string

  @column()
  declare short_name: string | null

  @column()
  declare normalized_value: number

  @column()
  declare generic_description: string | null

  @column()
  declare sort_order: number

  @column()
  declare expected_knowledge: string | null

  @column()
  declare expected_execution: string | null

  @column()
  declare autonomy_descriptor: string | null

  @column()
  declare complexity_descriptor: string | null

  @column()
  declare quality_descriptor: string | null

  @column()
  declare collaboration_descriptor: string | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare observable_behaviors: string[] | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare positive_examples: string[] | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare negative_examples: string[] | null

  @column()
  declare evidence_guidance: string | null

  @column()
  declare ceiling_guidance: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => ProficiencyScale, {
    foreignKey: 'scale_id',
  })
  declare scale: BelongsTo<typeof ProficiencyScale>

  @hasMany(() => SkillRubricLevel, {
    foreignKey: 'proficiency_level_id',
  })
  declare rubric_levels: HasMany<typeof SkillRubricLevel>
}
