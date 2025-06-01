import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, hasMany } from '@adonisjs/lucid/orm'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import type { CustomRoleDefinition } from '#types/database'
import User from './user.js'
import Task from './task.js'
import Project from './project.js'
import type { ManyToMany, HasMany } from '@adonisjs/lucid/types/relations'
import NotFoundException from '#exceptions/not_found_exception'

export default class Organization extends BaseModel {
  static override table = 'organizations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare description: string | null

  @column()
  declare logo: string | null

  @column()
  declare website: string | null

  @column()
  declare plan: string | null

  @column()
  declare owner_id: string

  // v3: custom_roles JSONB — custom role definitions for this org
  @column({
    prepare: (value: CustomRoleDefinition[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CustomRoleDefinition[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : (value ?? null),
  })
  declare custom_roles: CustomRoleDefinition[] | null

  // v3: partner_* columns merged from verified_partners table
  @column()
  declare partner_type: string | null

  @column.dateTime()
  declare partner_verified_at: DateTime | null

  @column()
  declare partner_verified_by: string | null

  @column()
  declare partner_verification_proof: string | null

  @column.dateTime()
  declare partner_expires_at: DateTime | null

  @column()
  declare partner_is_active: boolean | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @manyToMany(() => User, {
    pivotTable: 'organization_users',
    pivotColumns: ['org_role'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Task)
  declare tasks: HasMany<typeof Task>

  @hasMany(() => Project)
  declare projects: HasMany<typeof Project>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm organization active (chưa xóa) hoặc throw error
   * Thay thế: trx.from('organizations').where('id', id).whereNull('deleted_at')
   */
  static async findActiveOrFail(orgId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const org = await query.where('id', orgId).whereNull('deleted_at').first()

    if (!org) {
      throw new NotFoundException('Organization không tồn tại')
    }
    return org
  }

  /**
   * Kiểm tra organization có tồn tại và active không (boolean)
   */
  static async existsActive(orgId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    try {
      await this.findActiveOrFail(orgId, trx)
      return true
    } catch {
      return false
    }
  }

  /**
   * Kiểm tra slug đã tồn tại hay chưa (chỉ active orgs)
   */
  static async slugExists(slug: string, trx?: TransactionClientContract): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const org = await query.where('slug', slug).whereNull('deleted_at').first()
    return !!org
  }

  /**
   * Tìm unique slug (auto-increment counter)
   */
  static async getUniqueSlug(baseSlug: string, trx?: TransactionClientContract): Promise<string> {
    let slug = baseSlug

    for (let counter = 1; counter <= 1000; counter++) {
      const exists = await this.slugExists(slug, trx)
      if (!exists) return slug
      slug = `${baseSlug}-${String(counter)}`
    }

    const BusinessLogicException = (await import('#exceptions/business_logic_exception')).default
    throw new BusinessLogicException('Không thể tạo slug unique')
  }

  /**
   * Đếm số projects active trong organization
   */
  static async countActiveProjects(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const ProjectModel = (await import('./project.js')).default
    const query = trx ? ProjectModel.query({ client: trx }) : ProjectModel.query()
    const result = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * Paginate organizations by user membership
   * Thay thế: db.from('organizations as o').join('organization_users as ou')...
   */
  static async paginateByUser(
    userId: DatabaseId,
    options: {
      page: number
      limit: number
      search?: string
      plan?: string
      sortColumn?: string
      sortDirection?: 'asc' | 'desc'
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      id: string
      name: string
      slug: string
      description: string | null
      logo: string | null
      website: string | null
      plan: string
      owner_id: string
      created_at: Date
      updated_at: Date
    }>
    total: number
  }> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const baseDb = trx ?? db

    const query = baseDb
      .from('organizations as o')
      .join('organization_users as ou', 'o.id', 'ou.organization_id')
      .where('ou.user_id', userId)
      .whereNull('o.deleted_at')

    // Search filter
    if (options.search) {
      const search = options.search
      void query.where((builder) => {
        void builder
          .where('o.name', 'like', `%${search}%`)
          .orWhere('o.description', 'like', `%${search}%`)
      })
    }

    // Plan filter
    if (options.plan) {
      void query.where('o.plan', options.plan)
    }

    // Count total
    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = (await countQuery.first()) as { total?: number | string } | null
    const total = Number(countResult?.total ?? 0)

    // Apply sorting and pagination
    const sortColumn = options.sortColumn ?? 'o.created_at'
    const sortDirection = options.sortDirection ?? 'desc'
    const offset = (options.page - 1) * options.limit

    const organizations = await query
      .select(
        'o.id',
        'o.name',
        'o.slug',
        'o.description',
        'o.logo',
        'o.website',
        'o.plan',
        'o.owner_id',
        'o.created_at',
        'o.updated_at'
      )
      .orderBy(sortColumn, sortDirection)
      .limit(options.limit)
      .offset(offset)

    return { data: organizations, total }
  }
}
