import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import SystemRole from './system_role.js'
import UserStatus from './user_status.js'
import Organization from './organization.js'
import Task from './task.js'
import Project from './project.js'
import Conversation from './conversation.js'
import AuditLog from './audit_log.js'
import Notification from './notification.js'
import OrganizationUser from './organization_user.js'
import UserOAuthProvider from './user_oauth_provider.js'
import UserDetail from './user_detail.js'
import UserSkill from './user_skill.js'
import UserSpiderChartData from './user_spider_chart_data.js'

export default class User extends BaseModel {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  static override table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare username: string

  @column()
  declare email: string

  @column()
  declare status_id: string

  @column()
  declare system_role_id: string | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column()
  declare current_organization_id: string | null

  @column()
  declare auth_method: 'email' | 'google' | 'github'

  @belongsTo(() => SystemRole, {
    foreignKey: 'system_role_id',
  })
  declare system_role: BelongsTo<typeof SystemRole>

  @belongsTo(() => UserStatus, {
    foreignKey: 'status_id',
  })
  declare status: BelongsTo<typeof UserStatus>

  @belongsTo(() => Organization, {
    foreignKey: 'current_organization_id',
  })
  declare current_organization: BelongsTo<typeof Organization>

  @hasMany(() => Task, {
    foreignKey: 'creator_id',
  })
  declare created_tasks: HasMany<typeof Task>

  @hasMany(() => Task, {
    foreignKey: 'assigned_to',
  })
  declare assigned_tasks: HasMany<typeof Task>

  @hasMany(() => Project, {
    foreignKey: 'creator_id',
  })
  declare created_projects: HasMany<typeof Project>

  @hasMany(() => Project, {
    foreignKey: 'manager_id',
  })
  declare managed_projects: HasMany<typeof Project>

  @hasMany(() => Project, {
    foreignKey: 'owner_id',
  })
  declare owned_projects: HasMany<typeof Project>

  @manyToMany(() => Project, {
    pivotTable: 'project_members',
    pivotColumns: ['project_role_id'],
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  })
  declare projects: ManyToMany<typeof Project>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>

  @hasMany(() => AuditLog)
  declare audit_logs: HasMany<typeof AuditLog>

  @manyToMany(() => Conversation, {
    pivotTable: 'conversation_participants',
  })
  declare conversations: ManyToMany<typeof Conversation>

  @hasMany(() => UserOAuthProvider, {
    foreignKey: 'user_id',
  })
  declare oauth_providers: HasMany<typeof UserOAuthProvider>

  /**
   * Kiểm tra xem user có quyền admin hay không
   */
  get isAdmin() {
    const role = this.$preloaded.system_role as typeof this.system_role | undefined
    return role !== undefined && ['superadmin', 'system_admin'].includes(role.name)
  }

  @manyToMany(() => Organization, {
    pivotTable: 'organization_users',
    pivotColumns: ['role_id', 'status', 'invited_by'],
    pivotTimestamps: true,
  })
  declare organizations: ManyToMany<typeof Organization>
  /**
   * Mối quan hệ trực tiếp đến bảng pivot organization_users
   */
  @hasMany(() => OrganizationUser, {
    foreignKey: 'user_id',
  })
  declare organization_users: HasMany<typeof OrganizationUser>

  // ===== Profile Relationships =====
  @hasOne(() => UserDetail, {
    foreignKey: 'user_id',
  })
  declare detail: HasOne<typeof UserDetail>

  @hasMany(() => UserSkill, {
    foreignKey: 'user_id',
  })
  declare skills: HasMany<typeof UserSkill>

  @hasMany(() => UserSpiderChartData, {
    foreignKey: 'user_id',
  })
  declare spider_chart_data: HasMany<typeof UserSpiderChartData>
}
