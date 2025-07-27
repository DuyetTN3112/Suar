import db from '@adonisjs/lucid/services/db'

import Project from '#models/project'
import type { DatabaseId } from '#types/database'

interface CountRow {
  total: number | string
}

interface GroupCountRow {
  project_id: string
  total: number | string
}

const isCountRow = (value: unknown): value is CountRow => {
  if (!isRecord(value)) {
    return false
  }

  const total = value.total
  return typeof total === 'number' || typeof total === 'string'
}

const isGroupCountRow = (value: unknown): value is GroupCountRow => {
  if (!isRecord(value)) {
    return false
  }

  const projectId = value.project_id
  const total = value.total
  return typeof projectId === 'string' && (typeof total === 'number' || typeof total === 'string')
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

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
  projects: {
    id: string
    name: string
    description: string | null
    status: string
    created_at: string
    _count: {
      members: number
      tasks: number
    }
  }[]
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
    const totalRaw: unknown = await db
      .from('projects')
      .count('* as total')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()

    const activeRaw: unknown = await db
      .from('projects')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', 'in_progress')
      .whereNull('deleted_at')
      .first()

    const completedRaw: unknown = await db
      .from('projects')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', 'completed')
      .whereNull('deleted_at')
      .first()

    const total = isCountRow(totalRaw) ? totalRaw : null
    const active = isCountRow(activeRaw) ? activeRaw : null
    const completed = isCountRow(completedRaw) ? completedRaw : null

    return {
      total: toNumberValue(total?.total),
      active: toNumberValue(active?.total),
      completed: toNumberValue(completed?.total),
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
    let query = Project.query().where('organization_id', organizationId).whereNull('deleted_at')

    // Apply filters
    const search = filters.search
    if (search) {
      query = query.where((q) => {
        void q.where('name', 'ilike', `%${search}%`).orWhere('description', 'ilike', `%${search}%`)
      })
    }

    if (filters.status) {
      query = query.where('status', filters.status)
    }

    // Order by created_at DESC
    query = query.orderBy('created_at', 'desc')

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
      created_at: project.created_at.toISO() ?? new Date().toISOString(),
      _count: {
        members: memberCounts[project.id] ?? 0,
        tasks: taskCounts[project.id] ?? 0,
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
      description: data.description ?? null,
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

    const resultRaw = (await db
      .from('project_members')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .groupBy('project_id')) as unknown

    const result = Array.isArray(resultRaw) ? resultRaw : []

    return result.reduce<Record<string, number>>((acc, rowRaw) => {
      if (!isGroupCountRow(rowRaw)) {
        return acc
      }

      const row = rowRaw
      acc[row.project_id] = toNumberValue(row.total)
      return acc
    }, {})
  }

  /**
   * Get task counts for projects
   */
  private async getTaskCounts(projectIds: string[]): Promise<Record<string, number>> {
    if (projectIds.length === 0) return {}

    const resultRaw = (await db
      .from('tasks')
      .select('project_id')
      .count('* as total')
      .whereIn('project_id', projectIds)
      .whereNull('deleted_at')
      .groupBy('project_id')) as unknown

    const result = Array.isArray(resultRaw) ? resultRaw : []

    return result.reduce<Record<string, number>>((acc, rowRaw) => {
      if (!isGroupCountRow(rowRaw)) {
        return acc
      }

      const row = rowRaw
      acc[row.project_id] = toNumberValue(row.total)
      return acc
    }, {})
  }
}
