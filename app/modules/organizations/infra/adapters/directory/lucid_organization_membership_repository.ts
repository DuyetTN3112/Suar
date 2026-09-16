import {
  asLucidTransaction,
  toDate,
  toMembershipRecord,
  toMembershipWithUserRecord,
} from './persistence_helpers.js'

import type {
  OrganizationInvitationRecord,
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
  OrganizationMembershipWithOrganizationRecord,
  OrganizationSummaryRecord,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import OrgAccessRepository from '#modules/organizations/infra/repositories/access/read/org_access_repository'
import * as listingQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/infra/repositories/members/organization_user_repository/write/mutation_queries'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'

export class LucidOrganizationMembershipRepository implements OrganizationMembershipRepository {
  async find(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord | null> {
    const membership = await membershipQueries.findMembership(
      organizationId,
      userId,
      asLucidTransaction(transaction)
    )
    return membership ? toMembershipRecord(membership) : null
  }

  async findPending(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord | null> {
    const membership = await membershipQueries.findPendingMembership(
      organizationId,
      userId,
      asLucidTransaction(transaction)
    )
    return membership ? toMembershipRecord(membership) : null
  }

  getContext(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction,
    approvedOnly = true
  ) {
    return membershipQueries.getMembershipContext(
      organizationId,
      userId,
      asLucidTransaction(transaction),
      approvedOnly
    )
  }

  findApprovedContext(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ) {
    return membershipQueries.findApprovedMembershipContext(
      organizationId,
      userId,
      asLucidTransaction(transaction)
    )
  }

  findFirstApprovedContext(userId: string, transaction?: OrganizationTransaction) {
    return membershipQueries.findFirstApprovedMembershipContext(
      userId,
      asLucidTransaction(transaction)
    )
  }

  isApprovedMember(userId: string, organizationId: string, transaction?: OrganizationTransaction) {
    return membershipQueries.isApprovedMember(
      userId,
      organizationId,
      asLucidTransaction(transaction)
    )
  }

  isMember(userId: string, organizationId: string, transaction?: OrganizationTransaction) {
    return membershipQueries.isMember(userId, organizationId, asLucidTransaction(transaction))
  }

  async ensureApprovedMember(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<void> {
    await membershipQueries.findApprovedMemberOrFail(
      organizationId,
      userId,
      asLucidTransaction(transaction)
    )
  }

  async listByUser(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord[]> {
    const memberships = await membershipQueries.listMembershipsByUser(
      userId,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipRecord)
  }

  listMemberUserIds(
    organizationId: string,
    status?: string | null,
    transaction?: OrganizationTransaction
  ) {
    return membershipQueries.listMemberUserIds(
      organizationId,
      status,
      asLucidTransaction(transaction)
    )
  }

  async listSummariesByUser(
    userId: string,
    options: { approvedOnly?: boolean } = {},
    transaction?: OrganizationTransaction
  ): Promise<OrganizationSummaryRecord[]> {
    return membershipQueries.listOrganizationSummariesByUser(
      userId,
      options,
      asLucidTransaction(transaction)
    )
  }

  findOwnerOrganizationIds(userId: string, transaction?: OrganizationTransaction) {
    return membershipQueries.findOwnerMembershipIds(userId, asLucidTransaction(transaction))
  }

  async findPendingInvitationsPageByUser(
    userId: string,
    input: { page?: unknown; perPage?: unknown } = {},
    transaction?: OrganizationTransaction
  ) {
    const result = await membershipQueries.findPendingInvitationsPageByUser(
      userId,
      input,
      asLucidTransaction(transaction)
    )
    return {
      data: result.data.map(
        (invitation): OrganizationInvitationRecord => ({
          ...toMembershipRecord(invitation),
          organization: invitation.organization,
          inviter: {
            ...invitation.inviter,
            created_at: toDate(invitation.inviter.created_at),
          },
        })
      ),
      meta: result.meta,
    }
  }

  countMembers(organizationId: string, transaction?: OrganizationTransaction) {
    return listingQueries.countMembers(organizationId, asLucidTransaction(transaction))
  }

  countMembersByOrganizationIds(organizationIds: string[], transaction?: OrganizationTransaction) {
    return listingQueries.countMembersByOrgIds(organizationIds, asLucidTransaction(transaction))
  }

  async getMembersPreview(
    organizationId: string,
    limit: number,
    transaction?: OrganizationTransaction
  ) {
    const memberships = await listingQueries.getMembersPreview(
      organizationId,
      limit,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  paginateMembers(
    organizationId: string,
    options: Parameters<OrganizationMembershipRepository['paginateMembers']>[1],
    transaction?: OrganizationTransaction
  ) {
    return listingQueries.paginateMembers(organizationId, options, asLucidTransaction(transaction))
  }

  async findMembersWithUser(organizationId: string, transaction?: OrganizationTransaction) {
    const memberships = await listingQueries.findMembersWithUser(
      organizationId,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  async findMembersWithUserBySearch(
    organizationId: string,
    search: string,
    transaction?: OrganizationTransaction
  ) {
    const memberships = await listingQueries.findMembersWithUserBySearch(
      organizationId,
      search,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  async findMembersWithUserByIds(
    organizationId: string,
    userIds: string[],
    transaction?: OrganizationTransaction
  ) {
    const memberships = await listingQueries.findMembersWithUserByIds(
      organizationId,
      userIds,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  async findMembersExcludingUser(
    organizationId: string,
    excludedUserId: string,
    transaction?: OrganizationTransaction
  ) {
    const memberships = await listingQueries.findMembersExcludingUser(
      organizationId,
      excludedUserId,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  async findPendingMembershipsWithUserInfo(
    organizationId: string,
    transaction?: OrganizationTransaction
  ) {
    const memberships = await listingQueries.findPendingMembershipsWithUserInfo(
      organizationId,
      asLucidTransaction(transaction)
    )
    return memberships.map(toMembershipWithUserRecord)
  }

  async findPendingMembersWithDetails(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithOrganizationRecord[]> {
    const memberships = await listingQueries.findPendingMembersWithDetails(
      organizationId,
      asLucidTransaction(transaction)
    )
    return memberships.map((membership) => ({
      ...toMembershipWithUserRecord(membership),
      organization: membership.organization,
    }))
  }

  countPendingMembers(organizationId: string, transaction?: OrganizationTransaction) {
    return listingQueries.countPendingMembers(organizationId, asLucidTransaction(transaction))
  }

  async add(
    data: {
      organization_id: string
      user_id: string
      org_role: string
      status?: string
      invited_by?: string
    },
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord> {
    const trx = asLucidTransaction(transaction)
    const membership =
      data.invited_by && data.status !== OrganizationUserStatus.APPROVED
      ? await OrgAccessRepository.createInvitation(
          {
            organization_id: data.organization_id,
            user_id: data.user_id,
            org_role: data.org_role,
            invited_by: data.invited_by,
          },
          trx
        )
      : await membershipMutations.addMember(
          {
            organization_id: data.organization_id,
            user_id: data.user_id,
            org_role: data.org_role,
            ...(data.status ? { status: data.status as OrganizationUserStatus } : {}),
            ...(data.invited_by ? { invited_by: data.invited_by } : {}),
          },
          trx
        )
    return toMembershipRecord(membership)
  }

  updateRole(
    organizationId: string,
    userId: string,
    role: string,
    transaction?: OrganizationTransaction
  ) {
    return membershipMutations.updateRole(
      organizationId,
      userId,
      role,
      asLucidTransaction(transaction)
    )
  }

  updateStatus(
    organizationId: string,
    userId: string,
    status: 'pending' | 'approved' | 'rejected',
    transaction?: OrganizationTransaction
  ) {
    return membershipMutations.updateStatus(
      organizationId,
      userId,
      status,
      asLucidTransaction(transaction)
    )
  }

  delete(organizationId: string, userId: string, transaction?: OrganizationTransaction) {
    return membershipMutations.deleteMember(organizationId, userId, asLucidTransaction(transaction))
  }
}
