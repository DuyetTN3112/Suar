import OrganizationInvitation from '#models/organization_invitation'
import User from '#models/user'
import type { DatabaseId } from '#types/database'
import { DateTime } from 'luxon'

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
    const query = OrganizationInvitation.query().where('organization_id', organizationId)

    // Apply filters
    if (filters.search) {
      void query.where('email', 'ilike', `%${filters.search}%`)
    }

    if (filters.status) {
      void query.where('status', filters.status)
    }

    // Order by created_at DESC
    void query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    // Get inviter details
    const inviterIds = [...new Set(result.all().map((inv) => inv.invited_by))]
    const inviters = await User.query().whereIn('id', inviterIds)
    const inviterMap = new Map(inviters.map((u) => [u.id, u]))

    const invitations = result.all().map((invitation) => {
      const inviter = inviterMap.get(invitation.invited_by)

      return {
        id: invitation.id,
        email: invitation.email,
        org_role: invitation.org_role,
        invited_by: {
          id: invitation.invited_by,
          username: inviter ? inviter.username : 'Unknown',
        },
        status: invitation.status as 'pending' | 'accepted' | 'declined' | 'expired',
        invited_at: invitation.created_at.toISO() || new Date().toISOString(),
        expires_at: invitation.expires_at?.toISO() ?? new Date().toISOString(),
      }
    })

    return {
      invitations,
      total: result.total,
    }
  }

  /**
   * Create new invitation
   */
  async createInvitation(data: {
    organizationId: string
    email: string
    orgRole: string
    invitedById: string
  }) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    return await OrganizationInvitation.create({
      organization_id: data.organizationId,
      email: data.email,
      org_role: data.orgRole,
      invited_by: data.invitedById,
      status: 'pending',
      token: '',
      expires_at: DateTime.fromJSDate(expiresAt),
    })
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string) {
    const invitation = await OrganizationInvitation.findOrFail(invitationId)
    await invitation.delete()
  }
}
