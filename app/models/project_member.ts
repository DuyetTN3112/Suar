import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { ProjectRole } from '#constants'
import Project from './project.js'
import User from './user.js'

export default class ProjectMember extends BaseModel {
  static override table = 'project_members'

  // Composite Primary Key - Lucid treats both as primary
  @column({ isPrimary: true })
  declare project_id: string

  @column({ isPrimary: true })
  declare user_id: string

  // v3: inline string instead of FK to project_roles table
  @column()
  declare project_role: string

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

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm member trong project
   */
  static async findMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('project_id', projectId).where('user_id', userId).first()
  }

  /**
   * Tìm member hoặc throw error
   */
  static async findMemberOrFail(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query.where('project_id', projectId).where('user_id', userId).firstOrFail()
  }

  /**
   * Xóa member khỏi project
   */
  static async deleteMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    return (await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .delete()) as number[]
  }

  /**
   * Kiểm tra user có phải là project_manager hoặc project_owner không
   * v3: reads inline project_role string — no preload
   */
  static async isProjectManagerOrOwner(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const member = await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .whereIn('project_role', [ProjectRole.OWNER, ProjectRole.MANAGER])
      .first()

    return !!member
  }

  /**
   * Lấy role name của member — v3: reads inline project_role directly
   */
  static async getRoleName(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const member = await query.where('project_id', projectId).where('user_id', userId).first()
    return member?.project_role ?? 'unknown'
  }

  /**
   * Thêm member vào project — v3: uses project_role string
   */
  static async addMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    projectRole: string,
    trx?: TransactionClientContract
  ): Promise<ProjectMember> {
    return this.create(
      {
        project_id: String(projectId),
        user_id: String(userId),
        project_role: String(projectRole),
      },
      trx ? { client: trx } : undefined
    )
  }

  /**
   * Cập nhật role của member — v3: uses project_role string
   */
  static async updateRole(
    projectId: DatabaseId,
    userId: DatabaseId,
    newRole: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .update({ project_role: newRole })
  }

  /**
   * Kiểm tra user có phải là member của project không
   */
  static async isMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const member = await this.findMember(projectId, userId, trx)
    return !!member
  }

  /**
   * Kiểm tra user có access vào project không (creator/manager/owner/member)
   * Thay thế: complex join query checking p.creator_id, p.manager_id, p.owner_id, pm.user_id
   */
  static async hasAccess(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    // Check if member first (cheaper query)
    const isMember = await this.isMember(projectId, userId, trx)
    if (isMember) return true

    // Check project creator/manager/owner
    const ProjectModel = (await import('./project.js')).default
    const query = trx ? ProjectModel.query({ client: trx }) : ProjectModel.query()
    const project = await query.where('id', projectId).whereNull('deleted_at').first()

    if (!project) return false

    return (
      project.creator_id === String(userId) ||
      project.manager_id === String(userId) ||
      project.owner_id === String(userId)
    )
  }

  /**
   * Lấy danh sách members với user details (paginated)
   * Thay thế: db.from('project_members as pm').join('users').where(...)
   */
  static async getMembersWithDetails(
    projectId: DatabaseId,
    options?: {
      page?: number
      limit?: number
      role?: string
      search?: string
    },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      user_id: string
      role: string
      joined_at: Date
      username: string
      email: string
    }>
    total: number
  }> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const baseDb = trx ?? db

    const query = baseDb
      .from('project_members as pm')
      .select(
        'pm.user_id',
        'pm.project_role as role',
        'pm.created_at as joined_at',
        'u.username',
        'u.email'
      )
      .leftJoin('users as u', 'pm.user_id', 'u.id')
      .where('pm.project_id', projectId)

    if (options?.role) {
      void query.where('pm.project_role', options.role)
    }

    if (options?.search && options.search.trim().length > 0) {
      const searchTerm = `%${options.search.trim()}%`
      void query.where((builder) => {
        void builder.where('u.username', 'like', searchTerm).orWhere('u.email', 'like', searchTerm)
      })
    }

    // Count total
    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = (await countQuery.first()) as { total?: string | number } | null
    const total = Number(countResult?.total ?? 0)

    // Apply pagination
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const offset = (page - 1) * limit
    void query.orderBy('pm.created_at', 'asc').limit(limit).offset(offset)

    const members = await query

    return { data: members, total }
  }

  /**
   * Count members per project for batch enrichment
   * Thay thế: db.from('project_members').select('project_id').count('*').whereIn(...).groupBy(...)
   */
  static async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const query = trx ? this.query({ client: trx }) : this.query()
    const results = await query
      .whereIn('project_id', projectIds)
      .select('project_id')
      .count('* as total')
      .groupBy('project_id')

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.project_id), Number((row as any).$extras?.total ?? 0))
    }
    return map
  }
}
