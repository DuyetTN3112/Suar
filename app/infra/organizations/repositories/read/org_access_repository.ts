import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationRole, OrganizationUserStatus } from '#constants/organization_constants'
import OrganizationJoinRequest from '#infra/organizations/models/organization_join_request'
import OrganizationUser from '#infra/organizations/models/organization_user'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

/**
 * OrgAccessRepository
 *
 * Data access for organization invitations and join requests.
 * Invitation source-of-truth now lives on organization_users with invited_by + pending status.
 */
export default class OrgAccessRepository {
  private readonly _instanceMarker = true

  static {
    void new OrgAccessRepository()._instanceMarker
  }

  // ── Invitation queries ──

  static async hasPendingInvitation(
    organizationId: DatabaseId,
    email: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const invitee = await UserRepository.findByEmail(email, trx)
    if (!invitee) {
      return false
    }

    const query = trx ? OrganizationUser.query({ client: trx }) : OrganizationUser.query()
    const invitation = await query
      .where('organization_id', organizationId)
      .where('user_id', invitee.id)
      .whereNotNull('invited_by')
      .where('status', OrganizationUserStatus.PENDING)
      .first()
    return !!invitation
  }

  static async createInvitation(
    data: {
      organization_id: DatabaseId
      email: string
      org_role?: string
      invited_by: DatabaseId
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationUser> {
    const invitee = await UserRepository.findByEmail(data.email, trx)
    if (!invitee) {
      const { default: NotFoundException } = await import('#exceptions/not_found_exception')
      throw new NotFoundException('Không tìm thấy người dùng với email này')
    }

    const createData = {
      organization_id: data.organization_id,
      user_id: invitee.id,
      org_role: data.org_role ?? OrganizationRole.MEMBER,
      invited_by: data.invited_by,
      status: OrganizationUserStatus.PENDING,
    }
    if (trx) {
      return OrganizationUser.create(createData, { client: trx })
    }
    return OrganizationUser.create(createData)
  }

  // ── Join Request queries ──

  static async findJoinRequestByIdOrFail(requestId: DatabaseId, trx?: TransactionClientContract) {
    const query = trx
      ? OrganizationJoinRequest.query({ client: trx })
      : OrganizationJoinRequest.query()
    const request = await query.where('id', requestId).first()
    if (!request) {
      const { default: NotFoundException } = await import('#exceptions/not_found_exception')
      throw new NotFoundException('Join request not found')
    }
    return request
  }

  static async hasPendingRequest(
    orgId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx
      ? OrganizationJoinRequest.query({ client: trx })
      : OrganizationJoinRequest.query()
    const request = await query
      .where('organization_id', orgId)
      .where('user_id', userId)
      .where('status', OrganizationUserStatus.PENDING)
      .first()
    return !!request
  }

  static async createJoinRequest(
    data: {
      organization_id: DatabaseId
      user_id: DatabaseId
      message?: string
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationJoinRequest> {
    const createData: {
      organization_id: string
      user_id: string
      status: OrganizationUserStatus
      message?: string
    } = {
      organization_id: data.organization_id,
      user_id: data.user_id,
      status: OrganizationUserStatus.PENDING,
    }
    if (data.message !== undefined) {
      createData.message = data.message
    }
    if (trx) {
      return OrganizationJoinRequest.create(createData, { client: trx })
    }
    return OrganizationJoinRequest.create(createData)
  }

  static async updateJoinRequestStatus(
    requestId: DatabaseId,
    updateData: Record<string, unknown>,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = trx
      ? OrganizationJoinRequest.query({ client: trx })
      : OrganizationJoinRequest.query()
    await query.where('id', requestId).update(updateData)
  }

  static async getPendingRequestsByOrganization(
    orgId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx
      ? OrganizationJoinRequest.query({ client: trx })
      : OrganizationJoinRequest.query()
    return query
      .where('organization_id', orgId)
      .where('status', OrganizationUserStatus.PENDING)
      .preload('user')
      .preload('organization')
  }
}
