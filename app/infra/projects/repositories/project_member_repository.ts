import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { ProjectRole } from '#constants'
import { PAGINATION } from '#constants/common_constants'
import db from '@adonisjs/lucid/services/db'
import ProjectMember from '#models/project_member'

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

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? new Date(0) : date
  }
  return new Date(0)
}

/**
 * ProjectMemberRepository
 *
 * Data access for project membership (CRUD, role checks, access control).
 * Extracted from ProjectMember model static methods.
 */
export default class ProjectMemberRepository {
  // Keep one instance member so this is not a static-only utility class.
  isReady(): true {
    return true
  }

  static async findMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    return query.where('project_id', projectId).where('user_id', userId).first()
  }

  static async findMemberOrFail(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    return query.where('project_id', projectId).where('user_id', userId).firstOrFail()
  }

  static async deleteMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number[]> {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    return (await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .delete()) as number[]
  }

  static async isProjectManagerOrOwner(
    userId: DatabaseId,
    projectId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    const member = await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .whereIn('project_role', [ProjectRole.OWNER, ProjectRole.MANAGER])
      .first()

    return !!member
  }

  static async getRoleName(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string> {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    const member = await query.where('project_id', projectId).where('user_id', userId).first()
    return member?.project_role ?? 'unknown'
  }

  static async addMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    projectRole: string,
    trx?: TransactionClientContract
  ): Promise<ProjectMember> {
    return ProjectMember.create(
      {
        project_id: projectId,
        user_id: userId,
        project_role: projectRole,
      },
      trx ? { client: trx } : undefined
    )
  }

  static async updateRole(
    projectId: DatabaseId,
    userId: DatabaseId,
    newRole: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    await query
      .where('project_id', projectId)
      .where('user_id', userId)
      .update({ project_role: newRole })
  }

  static async isMember(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const member = await this.findMember(projectId, userId, trx)
    return !!member
  }

  static async hasAccess(
    projectId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const memberExists = await this.isMember(projectId, userId, trx)
    if (memberExists) return true

    const projectModule = await import('#models/project')
    const Project = projectModule.default
    const query = trx ? Project.query({ client: trx }) : Project.query()
    const project = await query.where('id', projectId).whereNull('deleted_at').first()

    if (!project) return false

    return (
      project.creator_id === userId || project.manager_id === userId || project.owner_id === userId
    )
  }

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

    const countQuery = query.clone().clearSelect().count('* as total')
    const countResult = (await countQuery.first()) as { total?: string | number } | null
    const total = Number(countResult?.total ?? 0)

    const page = options?.page ?? 1
    const limit = options?.limit ?? PAGINATION.DEFAULT_PER_PAGE
    const offset = (page - 1) * limit
    void query.orderBy('pm.created_at', 'asc').limit(limit).offset(offset)

    const membersRaw = (await query) as unknown
    const members = Array.isArray(membersRaw)
      ? membersRaw.filter(isRecord).map((member) => ({
          user_id: typeof member.user_id === 'string' ? member.user_id : '',
          role: typeof member.role === 'string' ? member.role : '',
          joined_at: toDateValue(member.joined_at),
          username: typeof member.username === 'string' ? member.username : '',
          email: typeof member.email === 'string' ? member.email : '',
        }))
      : []

    return { data: members, total }
  }

  static async countByProjectIds(
    projectIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
    const results = await query
      .whereIn('project_id', projectIds)
      .select('project_id')
      .count('* as total')
      .groupBy('project_id')

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(row.project_id, toNumberValue(isRecord(row.$extras) ? row.$extras.total : 0))
    }
    return map
  }
}
