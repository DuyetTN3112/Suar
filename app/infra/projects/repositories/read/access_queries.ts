import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { getCountValue, isRawRecord } from './shared.js'

import { PAGINATION } from '#constants/common_constants'
import { ProjectStatus } from '#constants/project_constants'
import Project from '#infra/projects/models/project'
import type { DatabaseId } from '#types/database'

export const isStakeholder = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const project = await query
    .where('id', projectId)
    .whereNull('deleted_at')
    .select('creator_id', 'manager_id', 'owner_id')
    .first()

  if (!project) return false

  return (
    project.creator_id === userId || project.manager_id === userId || project.owner_id === userId
  )
}

export const paginateByUserAccess = async (
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
): Promise<{ data: Record<string, unknown>[]; total: number }> => {
  const page = filters.page ?? 1
  const limit = filters.limit ?? PAGINATION.DEFAULT_PER_PAGE
  const offset = (page - 1) * limit
  const sortBy = filters.sort_by ?? 'created_at'
  const sortOrder = filters.sort_order ?? 'desc'

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

  if (filters.organization_id) {
    query = query.where('p.organization_id', filters.organization_id)
  } else {
    query = query.where((builder) => {
      void builder
        .where('p.creator_id', userId)
        .orWhere('p.manager_id', userId)
        .orWhere('p.owner_id', userId)
        .orWhere('pm.user_id', userId)
    })
  }

  if (filters.status) {
    query = query.where('p.status', filters.status)
  }
  if (filters.creator_id) {
    query = query.where('p.creator_id', filters.creator_id)
  }
  if (filters.manager_id) {
    query = query.where('p.manager_id', filters.manager_id)
  }
  if (filters.visibility) {
    query = query.where('p.visibility', filters.visibility)
  }

  if (filters.search && filters.search.trim().length > 0) {
    const searchTerm = `%${filters.search.trim()}%`
    query = query.where((builder) => {
      void builder.where('p.name', 'like', searchTerm).orWhere('p.description', 'like', searchTerm)
    })
  }

  query = query.groupBy(
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
    'o.name',
    'u1.username',
    'u1.id',
    'u2.username',
    'u2.id'
  )

  let total = 0
  try {
    const countResult = (await query
      .clone()
      .clearSelect()
      .clearOrder()
      .count('DISTINCT p.id as total')
      .first()) as unknown
    total = getCountValue(countResult, 'total')
  } catch {
    try {
      const fallback = (await query
        .clone()
        .clearSelect()
        .clearOrder()
        .count('* as total')
        .first()) as unknown
      total = getCountValue(fallback, 'total')
    } catch {
      total = 0
    }
  }

  query = query.orderBy(`p.${sortBy}`, sortOrder).limit(limit).offset(offset)

  const dataRaw = (await query) as unknown
  const data = Array.isArray(dataRaw) ? dataRaw.filter(isRawRecord) : []

  return { data, total }
}

export const getStatsByUserAccess = async (
  userId: DatabaseId,
  filters: { organization_id?: DatabaseId }
): Promise<{ total_projects: number; active_projects: number; completed_projects: number }> => {
  let statsQuery = db.from('projects as p').whereNull('p.deleted_at')

  if (filters.organization_id) {
    statsQuery = statsQuery.where('p.organization_id', filters.organization_id)
  } else {
    statsQuery = statsQuery
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .where((builder) => {
        void builder
          .where('p.creator_id', userId)
          .orWhere('p.manager_id', userId)
          .orWhere('p.owner_id', userId)
          .orWhere('pm.user_id', userId)
      })
  }

  const statsResults = (await Promise.all([
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
  ])) as unknown[]

  return {
    total_projects: getCountValue(statsResults[0], 'count'),
    active_projects: getCountValue(statsResults[1], 'count'),
    completed_projects: getCountValue(statsResults[2], 'count'),
  }
}
