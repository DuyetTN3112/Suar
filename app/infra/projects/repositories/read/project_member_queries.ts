import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectMember from '#infra/projects/models/project_member'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import type { DatabaseId } from '#types/database'

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
  project_id: DatabaseId
}

const getCountTotal = (row: CountTotalRow | null): number => {
  return toNumberValue(row?.$extras?.total ?? row?.total)
}

export const findMember = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId).where('user_id', userId).first()
}

export const findMemberOrFail = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId).where('user_id', userId).firstOrFail()
}

export const isProjectManagerOrOwner = async (
  userId: DatabaseId,
  projectId: DatabaseId,
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
  projectId: DatabaseId,
  excludeUserId?: DatabaseId,
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
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<string> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query.where('project_id', projectId).where('user_id', userId).first()
  return member?.project_role ?? 'unknown'
}

export const isMember = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<boolean> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const member = await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .first()
  return !!member
}

export const findMembersWithUser = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId).preload('user')
}

export const findActiveByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('user_id', userId).preload('project')
}

export const countByProject = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  const result = await query.where('project_id', projectId).count('* as total').first()
  const countRow: CountTotalRow | null = result
  return getCountTotal(countRow)
}

export const listPaged = async (
  projectId: DatabaseId,
  page: number,
  trx?: TransactionClientContract
) => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return query.where('project_id', projectId)
    .preload('user')
    .orderBy('created_at', 'desc')
    .paginate(page, 10)
}

interface MemberRow {
  user_id: DatabaseId
  role: string
  joined_at: Date
  username: string
  email: string
}

export const getMembersWithDetails = async (
  projectId: DatabaseId,
  options?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  },
  trx?: TransactionClientContract
): Promise<{ data: MemberRow[]; total: number }> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  let scopedQuery = query.where('project_id', projectId).preload('user')

  if (options?.role) {
    scopedQuery = scopedQuery.where('project_role', options.role)
  }

  if (options?.search) {
    const search = options.search
    scopedQuery = scopedQuery.whereHas('user', (userQuery) => {
      void userQuery.whereILike('username', `%${search}%`).orWhereILike('email', `%${search}%`)
    })
  }

  const page = options?.page ?? 1
  const limit = options?.limit ?? 10

  const result = await scopedQuery.orderBy('created_at', 'desc').paginate(page, limit)

  const data = result.all().map((member) => ({
    user_id: member.user_id,
    role: member.project_role,
    joined_at: member.created_at.toJSDate(),
    username: member.user.username,
    email: member.user.email ?? '',
  }))

  return {
    data,
    total: result.total,
  }
}

export const hasAccess = async (
  projectId: DatabaseId,
  userId: DatabaseId,
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
  projectIds: DatabaseId[],
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
