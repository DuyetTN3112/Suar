import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import UserSkill from '../../../users/infra/models/user_skill.js'

import ProjectSkill from './project_skill.js'
import SkillAlias from './skill_alias.js'
import SkillRubricVersion from './skill_rubric_version.js'

/**
 * Skill Model
 *
 * Individual skills with inline category_code and display_type (v3).
 * No more FK to skill_categories table.
 * - Technical: React, TypeScript, Node.js, etc.
 * - Soft Skills: Communication, Teamwork, etc.
 * - Delivery Metrics: Code Quality, Documentation, etc.
 */
export default class Skill extends BaseModel {
  static override table = 'skills'

  @column({ isPrimary: true })
  declare id: string

  // v3: inline category_code replaces category_id FK
  @column()
  declare category_code: string

  // v3: inline display_type replaces join to skill_categories
  @column()
  declare display_type: string

  @column()
  declare skill_code: string

  @column()
  declare skill_name: string

  @column()
  declare description: string | null

  @column()
  declare icon_url: string | null

  @column()
  declare is_active: boolean

  @column()
  declare sort_order: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @hasMany(() => UserSkill, {
    foreignKey: 'skill_id',
  })
  declare user_skills: HasMany<typeof UserSkill>

  @hasMany(() => SkillAlias, {
    foreignKey: 'skill_id',
  })
  declare aliases: HasMany<typeof SkillAlias>

  @hasMany(() => SkillRubricVersion, {
    foreignKey: 'skill_id',
  })
  declare rubric_versions: HasMany<typeof SkillRubricVersion>

  @hasMany(() => ProjectSkill, {
    foreignKey: 'skill_id',
  })
  declare project_skills: HasMany<typeof ProjectSkill>

  // All query methods/scopes have been moved to app/repositories/skill_repository.ts.
}
