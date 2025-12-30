import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ProficiencyLevel from './proficiency_level.js'
import SkillRubricVersion from './skill_rubric_version.js'

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

export default class SkillRubricLevel extends BaseModel {
  static override table = 'skill_rubric_levels'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare rubric_version_id: string

  @column()
  declare proficiency_level_id: string

  @column()
  declare summary: string | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare knowledge_expectations: string[] | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare observable_behaviors: string[] | null

  @column()
  declare independence_expectations: string | null

  @column()
  declare complexity_expectations: string | null

  @column()
  declare impact_scope_expectations: string | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare positive_examples: string[] | null

  @column({ prepare: prepareJsonColumn, consume: consumeJsonColumn })
  declare negative_examples: string[] | null

  @column()
  declare evidence_guidance: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => SkillRubricVersion, {
    foreignKey: 'rubric_version_id',
  })
  declare version: BelongsTo<typeof SkillRubricVersion>

  @belongsTo(() => ProficiencyLevel, {
    foreignKey: 'proficiency_level_id',
  })
  declare level: BelongsTo<typeof ProficiencyLevel>
}
