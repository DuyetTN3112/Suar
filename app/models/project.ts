import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import type { CustomRoleDefinition } from '#types/database'
import { ProjectStatus } from '#constants'
import db from '@adonisjs/lucid/services/db'
import User from './user.js'
import Organization from './organization.js'
import Task from './task.js'
import ProjectMember from './project_member.js'
import NotFoundException from '#exceptions/not_found_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
  declare budget: number

  @column()
  declare manager_id: string | null

  @column()
  declare owner_id: string | null

  @column()
  declare visibility: 'public' | 'private' | 'team'

  @column()
  declare allow_freelancer: boolean

  @column()
  declare approval_required_for_members: boolean

  /**
   * v3.0: Tags JSONB (merged from project_tags)
   */
  @column({
    prepare: (value: unknown[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | unknown[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare tags: unknown[] | null

  /**
   * v3.0: Custom roles JSONB (replaces project_roles table)
   */
  @column({
    prepare: (value: CustomRoleDefinition[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | CustomRoleDefinition[] | null) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare custom_roles: CustomRoleDefinition[] | null

  // ===== Relationships =====

  @belongsTo(() => User, {
    foreignKey: 'creator_id',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'manager_id',
  })
  declare manager: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'owner_id',
  })
  declare owner: BelongsTo<typeof User>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Task, {
    foreignKey: 'project_id',
  })
  declare tasks: HasMany<typeof Task>

  @hasMany(() => ProjectMember, {
    foreignKey: 'project_id',
  })
  declare project_members: HasMany<typeof ProjectMember>

  @manyToMany(() => User, {
    pivotTable: 'project_members',
    pivotColumns: ['project_role'],
    pivotTimestamps: {
      createdAt: 'created_at',
      updatedAt: false,
    },
  })
  declare members: ManyToMany<typeof User>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm project active trong organization
   * Thay thế: trx.from('projects').where('id', projectId).whereNull('deleted_at')
   */
  static async findActiveOrFail(projectId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const project = await query.where('id', projectId).whereNull('deleted_at').first()

    if (!project) {
      throw new NotFoundException('Project không tồn tại')
    }
    return project
  }

  /**
   * Tìm project active với forUpdate lock
   * Dùng cho update/delete/transfer operations
   */
  static async findActiveForUpdate(projectId: DatabaseId, trx: TransactionClientContract) {
    return this.query({ client: trx })
      .where('id', projectId)
      .whereNull('deleted_at')
      .forUpdate()
      .firstOrFail()
  }

  /**
   * Validate project thuộc organization
   * Thay thế: trx.from('projects').where('id', projectId).whereNull('deleted_at') + check org_id
   */
  static async validateBelongsToOrg(
    projectId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const project = await this.findActiveOrFail(projectId, trx)

    if (project.organization_id !== String(organizationId)) {
      throw new BusinessLogicException('Project and task must belong to the same organization')
    }
  }

  /**
   * Lấy danh sách project IDs trong organization
   * Thay thế: trx.from('projects').where('organization_id', orgId).whereNull('deleted_at').select('id')
   */
  static async findIdsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const projects = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .select('id')
    return projects.map((p) => String(p.id))
  }

  /**
   * Đếm số projects theo nhiều org IDs (batch count)
   * Return: Map<orgId, count>
   */
  static async countByOrgIds(
    orgIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map()
    const query = trx ? this.query({ client: trx }) : this.query()
    const results = await query
      .whereIn('organization_id', orgIds)
      .whereNull('deleted_at')
      .select('organization_id')
      .count('* as total')
      .groupBy('organization_id')
    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.organization_id), Number((row as any)?.$extras?.total ?? 0))
    }
    return map
  }

  /**
   * Đếm số tasks trong organization (qua project join)
   */
  static async countTasksByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const projectIds = await this.findIdsByOrganization(organizationId, trx)
    if (projectIds.length === 0) return 0
    const TaskModel = (await import('./task.js')).default
    const query = trx ? TaskModel.query({ client: trx }) : TaskModel.query()
    const result = await query
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * v3.0: Paginated project list — no JOIN to project_status, read status directly
   */
  static async paginateByUserAccess(
    userId: DatabaseId,
    filters: {
      page?: number
      limit?: number
      organization_id?: DatabaseId
      status?: string
      creator_id?: DatabaseId
      manager_id?: DatabaseId
      visibility?: 'public' | 'private' | 'team'
      search?: string
      sort_by?: string
      sort_order?: 'asc' | 'desc'
    }
  ): Promise<{ data: any[]; total: number }> {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit
    const sortBy = filters.sort_by || 'created_at'
    const sortOrder = filters.sort_order || 'desc'

    // Build base query — v3.0: no join to project_status
    let query = db
      .from('projects as p')
      .select(
        'p.id',
        'p.name',
        'p.description',
        'p.organization_id',
        'p.start_date',
        'p.end_date',
        'p.visibility',
        'p.budget',
        'p.status',
        'p.created_at',
        'p.updated_at',
        'o.name as organization_name',
        'u1.username as creator_name',
        'u1.id as creator_id',
        'u2.username as manager_name',
        'u2.id as manager_id'
      )
      .leftJoin('organizations as o', 'p.organization_id', 'o.id')
      .leftJoin('users as u1', 'p.creator_id', 'u1.id')
      .leftJoin('users as u2', 'p.manager_id', 'u2.id')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .whereNull('p.deleted_at')

    // User scope
    query = query.where((builder) => {
      void builder
        .where('p.creator_id', userId)
        .orWhere('p.manager_id', userId)
        .orWhere('pm.user_id', userId)
    })

    // Apply filters
    if (filters.organization_id) query = query.where('p.organization_id', filters.organization_id)
    if (filters.status) query = query.where('p.status', filters.status)
    if (filters.creator_id) query = query.where('p.creator_id', filters.creator_id)
    if (filters.manager_id) query = query.where('p.manager_id', filters.manager_id)
    if (filters.visibility) query = query.where('p.visibility', filters.visibility)

    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`
      query = query.where((builder) => {
        void builder
          .where('p.name', 'like', searchTerm)
          .orWhere('p.description', 'like', searchTerm)
      })
    }

    // Group by + count total
    query = query.groupBy('p.id')

    let total = 0
    try {
      const countResult = await query
        .clone()
        .clearSelect()
        .clearOrder()
        .count('DISTINCT p.id as total')
        .first()
      total = Number(countResult?.total ?? 0)
    } catch {
      try {
        const fallback = await query.clone().clearSelect().clearOrder().count('* as total').first()
        total = Number(fallback?.total ?? 0)
      } catch {
        // total = 0
      }
    }

    // Sort + paginate
    query = query.orderBy(`p.${sortBy}`, sortOrder).limit(limit).offset(offset)

    const data = await query

    return { data, total }
  }

  /**
   * v3.0: Get stats — dùng inline status strings
   */
  static async getStatsByUserAccess(
    userId: DatabaseId,
    filters: { organization_id?: DatabaseId }
  ): Promise<{ total_projects: number; active_projects: number; completed_projects: number }> {
    let statsQuery = db
      .from('projects as p')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .whereNull('p.deleted_at')
      .where((builder) => {
        void builder
          .where('p.creator_id', userId)
          .orWhere('p.manager_id', userId)
          .orWhere('pm.user_id', userId)
      })

    if (filters.organization_id) {
      statsQuery = statsQuery.where('p.organization_id', filters.organization_id)
    }

    const [totalResult, activeResult, completedResult] = await Promise.all([
      statsQuery.clone().countDistinct('p.id as count').first(),
      statsQuery
        .clone()
        .whereIn('p.status', [ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS])
        .countDistinct('p.id as count')
        .first(),
      statsQuery
        .clone()
        .where('p.status', ProjectStatus.COMPLETED)
        .countDistinct('p.id as count')
        .first(),
    ])

    return {
      total_projects: Number(totalResult?.count ?? 0),
      active_projects: Number(activeResult?.count ?? 0),
      completed_projects: Number(completedResult?.count ?? 0),
    }
  }
}
