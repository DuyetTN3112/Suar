import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'



import ProjectMember from '../project-members/project_member.js'

import type { ProjectCustomRoleDefinition as CustomRoleDefinition } from '#modules/projects/public_contracts/custom_role_definition'

export default class Project extends BaseModel {
  static override table = 'projects'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare creator_id: string

  @column()
  declare name: string

  @column()
  declare description: string | null

  @column()
  declare organization_id: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime()
  declare start_date: DateTime | null

  @column.dateTime()
  declare end_date: DateTime | null

  /**
   * v3.0: Inline status VARCHAR — replaces status_id UUID → project_status table
   * CHECK: 'pending', 'in_progress', 'completed', 'cancelled'
   */
  @column()
  declare status: string

  @column()
  declare manager_id: string | null

  @column()
  declare owner_id: string | null

  @column()
  declare visibility: 'public' | 'private' | 'team'

  @column()
  declare allow_external_contributors: boolean

  @column()
  declare approval_required_for_members: boolean

  /**
   * v3.0: Tags JSONB (merged from project_tags)
   */
  @column({
    prepare: (value: unknown[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | unknown[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as unknown[]) : value,
  })
  declare tags: unknown[] | null

  /**
   * Controlled business-domain context for every Task in this Project.
   */
  @column({
    prepare: (value: string[] | null) => JSON.stringify(value ?? []),
    consume: (value: string | string[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as string[]) : value ?? [],
  })
  declare business_domains: string[]

  /**
   * v3.0: Custom roles JSONB (replaces project_roles table)
   */
  @column({
    prepare: (value: CustomRoleDefinition[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CustomRoleDefinition[] | null) =>
      typeof value === 'string' ? (JSON.parse(value) as CustomRoleDefinition[]) : value,
  })
  declare custom_roles: CustomRoleDefinition[] | null

  // ===== Relationships =====

  @hasMany(() => ProjectMember, {
    foreignKey: 'project_id',
  })
  declare project_members: HasMany<typeof ProjectMember>

}
