import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { ProjectStatus } from '#constants'
import { PAGINATION } from '#constants/common_constants'
import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'
import NotFoundException from '#exceptions/not_found_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * ProjectRepository
 *
 * Data access for projects (CRUD, pagination, stats).
 * Extracted from Project model static methods.
 */
export default class ProjectRepository {
  static async findActiveOrFail(projectId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx ? Project.query({ client: trx }) : Project.query()
    const project = await query.where('id', projectId).whereNull('deleted_at').first()

    if (!project) {
      throw new NotFoundException('Project không tồn tại')
    }
    return project
  }

  static async findActiveForUpdate(projectId: DatabaseId, trx: TransactionClientContract) {
    return Project.query({ client: trx })
      .where('id', projectId)
      .whereNull('deleted_at')
      .forUpdate()
      .firstOrFail()
  }

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

  static async findIdsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx ? Project.query({ client: trx }) : Project.query()
    const projects = await query
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .select('id')
    return projects.map((p) => String(p.id))
  }

  static async countByOrgIds(
    orgIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map()
    const query = trx ? Project.query({ client: trx }) : Project.query()
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

  static async countTasksByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const projectIds = await this.findIdsByOrganization(organizationId, trx)
    if (projectIds.length === 0) return 0
    const TaskModel = (await import('#models/task')).default
    const query = trx ? TaskModel.query({ client: trx }) : TaskModel.query()
    const result = await query
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

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
    const limit = filters.limit || PAGINATION.DEFAULT_PER_PAGE
    const offset = (page - 1) * limit
    const sortBy = filters.sort_by || 'created_at'
    const sortOrder = filters.sort_order || 'desc'

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

    query = query.where((builder) => {
      void builder
        .where('p.creator_id', userId)
        .orWhere('p.manager_id', userId)
        .orWhere('pm.user_id', userId)
    })

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

    query = query.orderBy(`p.${sortBy}`, sortOrder).limit(limit).offset(offset)

    const data = await query

    return { data, total }
  }

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
