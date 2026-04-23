import db from '@adonisjs/lucid/services/db'

import type { DatabaseId } from '#types/database'

/**
 * OrganizationInvitationRepository
 *
 * Infrastructure - Data access for organization invitation operations
 */

export interface ListInvitationsFilters {
  search?: string
  status?: string
}

export interface InvitationData {
  id: string
  email: string
  org_role: string
  invited_by: {
    id: string
    username: string
  }
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_at: string
  expires_at: string
}

export interface ListInvitationsResult {
  invitations: InvitationData[]
  total: number
}

interface InvitationCountRow {
  total: number | string
}

interface InvitationRow {
  user_id: string
  email: string | null
  org_role: string
  status: string
  created_at: Date | string
  inviter_id: string | null
  inviter_username: string | null
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

const toStringValue = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const toDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    return new Date(value)
  }
  return new Date(0)
}

const isInvitationCountRow = (value: unknown): value is InvitationCountRow => {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.total === 'number' || typeof value.total === 'string'
}

const isInvitationRow = (value: unknown): value is InvitationRow => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.user_id === 'string' &&
    (typeof value.email === 'string' || value.email === null) &&
    typeof value.org_role === 'string' &&
    typeof value.status === 'string' &&
    (value.created_at instanceof Date || typeof value.created_at === 'string') &&
    (typeof value.inviter_id === 'string' || value.inviter_id === null) &&
    (typeof value.inviter_username === 'string' || value.inviter_username === null)
  )
}

export default class OrganizationInvitationRepository {
  /**
   * List invitations for an organization with filters and pagination
   */
  async listInvitations(
    organizationId: DatabaseId,
    filters: ListInvitationsFilters,
    page: number,
    perPage: number
  ): Promise<ListInvitationsResult> {
    const query = db
      .from('organization_users as ou')
      .innerJoin('users as invitee', 'invitee.id', 'ou.user_id')
      .leftJoin('users as inviter', 'inviter.id', 'ou.invited_by')
      .where('ou.organization_id', organizationId)
      .whereNotNull('ou.invited_by')
      .select(
        'ou.user_id',
        'invitee.email',
        'ou.org_role',
        'ou.status',
        'ou.created_at',
        'inviter.id as inviter_id',
        'inviter.username as inviter_username'
      )

    const search = filters.search?.trim()
    if (search) {
      void query.where((builder) => {
        void builder
          .whereILike('invitee.email', `%${search}%`)
          .orWhereILike('invitee.username', `%${search}%`)
      })
    }

    if (filters.status) {
      const mappedStatus =
        filters.status === 'accepted'
          ? 'approved'
          : filters.status === 'declined'
            ? 'rejected'
            : filters.status
      void query.where('ou.status', mappedStatus)
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('* as total')
    const countResultRaw: unknown = await countQuery.first()
    const countResult = isInvitationCountRow(countResultRaw) ? countResultRaw : null
    const total = countResult ? toNumberValue(countResult.total) : 0

    const rowsRaw: unknown = await query
      .orderBy('ou.created_at', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage)
    const rows = Array.isArray(rowsRaw) ? rowsRaw.filter(isInvitationRow) : []

    const invitations = rows.map((invitation) => {
      const createdAt = toDateValue(invitation.created_at)
      const expiresAt = new Date(createdAt)
      expiresAt.setDate(expiresAt.getDate() + 7)
      const status: InvitationData['status'] =
        invitation.status === 'approved'
          ? 'accepted'
          : invitation.status === 'rejected'
            ? 'declined'
            : 'pending'

      return {
        id: toStringValue(invitation.user_id),
        email: toStringValue(invitation.email),
        org_role: toStringValue(invitation.org_role),
        invited_by: {
          id: toStringValue(invitation.inviter_id),
          username: invitation.inviter_username ?? 'Unknown',
        },
        status,
        invited_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      }
    })

    return {
      invitations,
      total,
    }
  }
}
