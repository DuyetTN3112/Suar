import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import type { UserProfileSettings, UserTrustData, UserCredibilityData } from '#types/database'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import { SystemRoleName } from '#constants'
import Organization from './organization.js'
import Task from './task.js'
import Project from './project.js'
import Conversation from './conversation.js'
import AuditLog from './audit_log.js'
import Notification from './notification.js'
import OrganizationUser from './organization_user.js'
import UserOAuthProvider from './user_oauth_provider.js'
import UserSkill from './user_skill.js'
import NotFoundException from '#exceptions/not_found_exception'

export default class User extends BaseModel {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)

  static override table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare username: string

  @column()
  declare email: string | null

  @column()
  declare status: string

  /**
   * v3.0: Inline system_role VARCHAR — replaces system_role_id UUID → system_roles table
   * CHECK: 'superadmin', 'system_admin', 'registered_user'
   */
  @column()
  declare system_role: string

  @column()
  declare current_organization_id: string | null

  @column()
  declare auth_method: 'email' | 'google' | 'github'

  // ===== Merged from user_details (v2.0) =====
  @column()
  declare avatar_url: string | null

  @column()
  declare bio: string | null

  @column()
  declare phone: string | null

  @column()
  declare address: string | null

  @column()
  declare timezone: string

  @column()
  declare language: string

  @column()
  declare is_freelancer: boolean

  @column()
  declare freelancer_rating: number | null

  @column()
  declare freelancer_completed_tasks_count: number

  // ===== JSONB columns =====

  /**
   * v3.0: Merged from public_profile_settings
   */
  @column({
    prepare: (value: UserProfileSettings | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | UserProfileSettings | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare profile_settings: UserProfileSettings | null

  /**
   * v3.0: trust_data — current_tier_code string (not UUID)
   */
  @column({
    prepare: (value: UserTrustData | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | UserTrustData | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare trust_data: UserTrustData | null

  /**
   * v3.0: Merged from reviewer_credibility
   */
  @column({
    prepare: (value: UserCredibilityData | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | UserCredibilityData | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare credibility_data: UserCredibilityData | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====

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
    pivotColumns: ['project_role'],
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
   * v3.0: Check isAdmin directly from inline system_role column
   * No more preloading system_role relationship
   */
  get isAdmin() {
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      this.system_role as SystemRoleName
    )
  }

  @manyToMany(() => Organization, {
    pivotTable: 'organization_users',
    pivotColumns: ['org_role', 'status', 'invited_by'],
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

  @hasMany(() => UserSkill, {
    foreignKey: 'user_id',
  })
  declare skills: HasMany<typeof UserSkill>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm user active (chưa xóa, status = 'active') hoặc throw error
   */
  static async findActiveOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const user = await query
      .where('id', userId)
      .whereNull('deleted_at')
      .where('status', 'active')
      .first()

    if (!user) {
      throw new NotFoundException('User không tồn tại hoặc không active')
    }
    return user
  }

  /**
   * Kiểm tra user có active không (boolean)
   */
  static async isActive(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await this.findActiveOrFail(userId, trx)
      return true
    } catch {
      return false
    }
  }

  /**
   * v3.0: Kiểm tra user có phải là freelancer — đọc trực tiếp từ users.is_freelancer
   * Không cần JOIN user_details nữa
   */
  static async isFreelancer(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return !!user?.is_freelancer
  }

  /**
   * v3.0: Kiểm tra user có phải là superadmin — đọc trực tiếp users.system_role
   * Không cần preload/JOIN system_roles nữa
   */
  static async isSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role === SystemRoleName.SUPERADMIN
  }

  /**
   * Tìm user chưa xóa hoặc throw
   */
  static async findNotDeletedOrFail(userId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('id', userId).whereNull('deleted_at').firstOrFail()
  }

  /**
   * v3.0: Lấy tên system role — đọc trực tiếp users.system_role
   * Không cần preload/JOIN system_roles nữa
   */
  static async getSystemRoleName(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const user = await query.where('id', userId).whereNull('deleted_at').first()
    return user?.system_role ?? null
  }

  /**
   * v3.0: Kiểm tra user có phải là system admin (superadmin hoặc system_admin)
   */
  static async isSystemAdmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const roleName = await this.getSystemRoleName(userId, trx)
    return [SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN].includes(
      roleName as SystemRoleName
    )
  }
}
