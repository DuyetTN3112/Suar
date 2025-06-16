import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'

/**
 * OrganizationProjectRepository (Infrastructure Layer)
 *
 * Handles project queries for organization dashboard.
 */

export interface DashboardProjectStats {
  total: number
  active: number
  completed: number
}

export interface ListProjectsFilters {
  search?: string
  status?: string
}

export interface ListProjectsResult {
  projects: Array<{
    id: string
    name: string
    description: string | null
    status: string
    created_at: string
    _count: {
      members: number
      tasks: number
    }
  }>
  total: number
}

export interface CreateProjectData {
  name: string
  description?: string
}

export default class OrganizationProjectRepository {
  /**
   * Get project statistics for organization dashboard
   */
  async getProjectStats(organizationId: string): Promise<DashboardProjectStats> {
    const [total, active, completed] = await Promise.all([
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'in_progress')
        .whereNull('deleted_at')
        .first(),
      db
        .from('projects')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'completed')
        .whereNull('deleted_at')
        .first(),
    ])

    return {
      total: Number(total?.total || 0),
      active: Number(active?.total || 0),
      completed: Number(completed?.total || 0),
    }
  }

  /**
   * List projects for an organization with filters and pagination
   */
  async listProjects(
    organizationId: DatabaseId,
    filters: ListProjectsFilters,
    page: number,
    perPage: number
  ): Promise<ListProjectsResult> {
    const query = Project.query().where('organization_id', organizationId).whereNull('deleted_at')

    // Apply filters
    if (filters.search) {
      query.where((q) => {
        q.where('name', 'ilike', `%${filters.search}%`).orWhere(
          'description',
          'ilike',
          `%${filters.search}%`
        )
      })
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    // Order by created_at DESC
    query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    // Get counts for each project
    const projectIds = result.all().map((p) => p.id)
    const memberCounts = await this.getMemberCounts(projectIds)
    const taskCounts = await this.getTaskCounts(projectIds)

    const projects = result.all().map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      created_at: project.created_at?.toISO() || new Date().toISOString(),
      _count: {
        members: memberCounts[project.id] || 0,
        tasks: taskCounts[project.id] || 0,
      },
    }))

    return {
      projects,
      total: result.total,
    }
  }

  /**
   * Create a new project
   */
  async createProject(
    organizationId: DatabaseId,
    creatorId: DatabaseId,
    data: CreateProjectData
  ): Promise<Project> {
    const project = await Project.create({
      organization_id: organizationId,
      creator_id: creatorId,
      name: data.name,
      description: data.description || null,
      status: 'pending',
      budget: 0,
      visibility: 'team',
      allow_freelancer: false,
      approval_required_for_members: false,
    })

    return project
  }

  /**
   * Get member counts for projects
   */
  private async getMemberCounts(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {}

    const result = await db
      .from('project_members')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .groupBy('project_id')

    return result.reduce<Record<string, number>>((acc, row) => {
      acc[row.project_id] = Number(row.total || 0)
      return acc
    }, {})
  }

  /**
   * Get task counts for projects
   */
  private async getTaskCounts(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {}

    const result = await db
      .from('tasks')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .groupBy('project_id')

    return result.reduce<Record<string, number>>((acc, row) => {
      acc[row.project_id] = Number(row.total || 0)
      return acc
    }, {})
  }
}
