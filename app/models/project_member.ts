import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Project from './project.js'
import User from './user.js'
import ProjectRole from './project_role.js'

export default class ProjectMember extends BaseModel {
  static override table = 'project_members'

  // Composite Primary Key - Lucid treats both as primary
  @column({ isPrimary: true })
  declare project_id: number

  @column({ isPrimary: true })
  declare user_id: number

  @column()
  declare project_role_id: number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => Project, {
    foreignKey: 'project_id',
  })
  declare project: BelongsTo<typeof Project>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => ProjectRole, {
    foreignKey: 'project_role_id',
  })
  declare project_role: BelongsTo<typeof ProjectRole>

  // Helper methods for composite key queries
  static async findMember(projectId: number, userId: number) {
    return await this.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .first()
  }

  static async findMemberOrFail(projectId: number, userId: number) {
    return await this.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .firstOrFail()
  }

  static async deleteMember(projectId: number, userId: number) {
    return await this.query()
      .where('project_id', projectId)
      .where('user_id', userId)
      .delete()
  }
}
