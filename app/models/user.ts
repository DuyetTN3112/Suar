import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo, hasOne, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { BelongsTo, HasOne, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import UserRole from './user_role.js'
import UserStatus from './user_status.js'
import UserDetail from './user_detail.js'
import UserProfile from './user_profile.js'
import UserUrl from './user_url.js'
import Organization from './organization.js'
import Task from './task.js'
import Project from './project.js'
import Conversation from './conversation.js'
import UserSetting from './user_setting.js'
import AuditLog from './audit_log.js'
import Notification from './notification.js'
import OrganizationUser from './organization_user.js'
import PasswordResetToken from './password_reset_token.js'
import UserOAuthProvider from './user_oauth_provider.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email', 'username'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare first_name: string

  @column()
  declare last_name: string

  @column()
  declare username: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare status_id: number

  @column()
  declare role_id: number

  @column()
  declare full_name: string

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column()
  declare current_organization_id: number | null

  @column()
  declare auth_method: 'email' | 'google' | 'github'

  @belongsTo(() => UserRole, {
    foreignKey: 'role_id',
  })
  declare role: BelongsTo<typeof UserRole>

  @belongsTo(() => UserStatus, {
    foreignKey: 'status_id',
  })
  declare status: BelongsTo<typeof UserStatus>

  @belongsTo(() => Organization, {
    foreignKey: 'current_organization_id',
  })
  declare current_organization: BelongsTo<typeof Organization>

  @hasOne(() => UserDetail, {
    foreignKey: 'user_id',
  })
  declare user_detail: HasOne<typeof UserDetail>

  @hasOne(() => UserProfile, {
    foreignKey: 'user_id',
  })
  declare user_profile: HasOne<typeof UserProfile>

  @hasOne(() => UserSetting, {
    foreignKey: 'user_id',
  })
  declare user_setting: HasOne<typeof UserSetting>

  @hasMany(() => UserUrl)
  declare user_urls: HasMany<typeof UserUrl>

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
    pivotColumns: ['role'],
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
   * Lấy avatar URL của người dùng
   */
  get avatar() {
    return this.user_detail?.avatar_url || '/images/default-avatar.png'
  }

  /**
   * Kiểm tra xem user có quyền admin hay không
   */
  get isAdmin() {
    return ['superadmin', 'admin'].includes(this.role?.name.toLowerCase())
  }

  @manyToMany(() => Organization, {
    pivotTable: 'organization_users',
    pivotColumns: ['role_id'],
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

  @hasMany(() => PasswordResetToken, {
    foreignKey: 'user_id',
  })
  declare passwordResetTokens: HasMany<typeof PasswordResetToken>
}
