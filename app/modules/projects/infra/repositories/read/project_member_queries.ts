import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectMember from '#modules/projects/infra/models/project_member'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'

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

interface CountTotalRow {
  total?: unknown
  $extras?: Record<string, unknown>
}

interface ProjectMemberCountRow extends CountTotalRow {
  project_id: string
}

const getCountTotal = (row: CountTotalRow | null): number => {
  return toNumberValue(row?.$extras?.['total'] ?? row?.total)
}

export const findMember = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId).where('user_id', userId).first()
}

export const findMemberOrFail = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId).where('user_id', userId).firstOrFail()
}

export const isProjectManagerOrOwner = async (
  userId: string,
  projectId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .whereIn('project_role', [ProjectRole.OWNER, ProjectRole.MANAGER])
    .first()

  return !!member
}

export const findManagerOrOwnerIds = async (
  projectId: string,
  excludeUserId?: string,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  let scopedQuery = query
    .where('project_id', projectId)
    .whereIn('project_role', [ProjectRole.OWNER, ProjectRole.MANAGER])

  if (excludeUserId) {
    scopedQuery = scopedQuery.whereNot('user_id', excludeUserId)
  }

  const members = await scopedQuery
  return members.map((member) => member.user_id)
}

export const getRoleName = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<string> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query.where('project_id', projectId).where('user_id', userId).first()
  return member?.project_role ?? 'unknown'
}

export const isMember = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .first()
  return !!member
}

export const findActiveByUser = async (
  userId: string,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('user_id', userId).preload('project')
}

export const listProjectIdsForMember = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const memberships = await query
    .where('user_id', userId)
    .select('project_id')
    .orderBy('project_id', 'asc')

  return [...new Set(memberships.map((membership) => membership.project_id))]
}

export const listMemberUserIds = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const memberships = await query.where('project_id', projectId).select('user_id')
  return memberships.map((membership) => membership.user_id)
}

export const countByProject = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<number> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const result = await query.where('project_id', projectId).count('* as total').first()
  const countRow: CountTotalRow | null = result
  return getCountTotal(countRow)
}

interface MemberRow {
  user_id: string
  role: string
  project_professional_role_id: string | null
  professional_role_name: string | null
  professional_role_code: string | null
  joined_at: Date
  username: string
  email: string
}

export const getMembersWithDetails = async (
  projectId: string,
  options?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  },
  trx?: TransactionClientContract
): Promise<{ data: MemberRow[]; total: number }> => {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 10
  const client = trx ?? db
  let baseQuery = client
    .from('project_members as pm')
    .join('users as u', 'u.id', 'pm.user_id')
    .leftJoin('project_professional_roles as ppr', 'ppr.id', 'pm.project_professional_role_id')
    .where('pm.project_id', projectId)

  if (options?.role) {
    baseQuery = baseQuery.where('pm.project_role', options.role)
  }

  if (options?.search) {
    const search = options.search
    baseQuery = baseQuery.where((query) => {
      void query.whereILike('u.username', `%${search}%`).orWhereILike('u.email', `%${search}%`)
    })
  }

  const totalRow = (await baseQuery.clone().count('* as total').first()) as CountTotalRow | null
  const rows = (await baseQuery
    .clone()
    .select(
      'pm.user_id',
      'pm.project_role as role',
      'pm.project_professional_role_id',
      'pm.created_at as joined_at',
      'u.username',
      'u.email',
      'ppr.name as professional_role_name',
      'ppr.code as professional_role_code'
    )
    .orderBy('pm.created_at', 'desc')
    .orderBy('pm.user_id', 'desc')
    .offset((page - 1) * limit)
    .limit(limit)) as Array<{
      user_id: string
      role: string
      project_professional_role_id: string | null
      professional_role_name: string | null
      professional_role_code: string | null
      joined_at: string | Date
      username: string
      email: string | null
    }>

  const data = rows.map((member) => ({
    user_id: member.user_id,
    role: member.role,
    project_professional_role_id: member.project_professional_role_id,
    professional_role_name: member.professional_role_name,
    professional_role_code: member.professional_role_code,
    joined_at: member.joined_at instanceof Date ? member.joined_at : new Date(member.joined_at),
    username: member.username,
    email: member.email ?? '',
  }))

  return {
    data,
    total: getCountTotal(totalRow),
  }
}

export const hasAccess = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .first()
  return !!member
}

export const countByProjectIds = async (
  projectIds: string[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  if (projectIds.length === 0) {
    return new Map<string, number>()
  }

  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const rows = await query
    .whereIn('project_id', projectIds)
    .count('* as total')
    .groupBy('project_id')
    .select('project_id')

  const result = new Map<string, number>()
  for (const row of rows) {
    const countRow: ProjectMemberCountRow = row
    const projectId = countRow.project_id
    const total = getCountTotal(countRow)
    result.set(projectId, total)
  }

  return result
}
