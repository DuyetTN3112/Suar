import type { OrganizationTransaction } from '../organization_transaction.js'

import type { MembershipContext } from '#modules/organizations/domain/access/org_types'
import type { OrganizationCustomRoleDefinition } from '#modules/organizations/public_contracts/access/custom_role_definition'
import type {
  OrganizationMembershipHistoryFact,
  OrganizationNameFact,
} from '#modules/organizations/public_contracts/members/organization_membership_history'


export type OrganizationSerializedDateTime = string | null

export interface OrganizationRecord extends Record<string, unknown> {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  plan: string | null
  owner_id: string
  custom_roles: OrganizationCustomRoleDefinition[] | null
  partner_type: string | null
  partner_verified_at: OrganizationSerializedDateTime
  partner_verified_by: string | null
  partner_verification_proof: string | null
  partner_expires_at: OrganizationSerializedDateTime
  partner_is_active: boolean | null
  deleted_at: OrganizationSerializedDateTime
  created_at: OrganizationSerializedDateTime
  updated_at: OrganizationSerializedDateTime
}

export interface OrganizationBasicRecord {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  website: string | null
  owner_id: string
  created_at: Date
  updated_at: Date
}

export interface OrganizationMembershipRecord extends Record<string, unknown> {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: Date
  updated_at: Date
}

export interface OrganizationMemberIdentityRecord {
  id: string
  username: string
  email: string | null
  status: string
  system_role: string
  avatar_url: string | null
  created_at: Date
}

export interface OrganizationMembershipWithUserRecord extends OrganizationMembershipRecord {
  user: OrganizationMemberIdentityRecord
}

export interface OrganizationMembershipWithOrganizationRecord
  extends OrganizationMembershipWithUserRecord {
  organization: {
    id: string
    name: string
    logo: string | null
  }
}

export interface OrganizationInvitationRecord extends OrganizationMembershipRecord {
  organization: {
    id: string
    name: string
    logo: string | null
  }
  inviter: OrganizationMemberIdentityRecord
}

export interface OrganizationSummaryRecord {
  id: string
  name: string
  slug: string
  logo: string | null
  org_role: string
  status: string
  invited_by: string | null
}

export interface PaginatedOrganizationMemberRecord {
  user_id: string
  org_role: string
  status: string
  created_at: Date | string
  last_activity_at?: Date | string | null
  user: {
    id: string
    username: string
    email: string | null
    status: string
  }
}

export abstract class OrganizationReader {
  abstract findActiveOrFail(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract existsActive(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean>
  abstract slugExists(slug: string, transaction?: OrganizationTransaction): Promise<boolean>
  abstract findById(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord | null>
  abstract findBasicInfo(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<{ id: string; name: string } | null>
  abstract findAllActive(transaction?: OrganizationTransaction): Promise<OrganizationRecord[]>
  abstract findAllActiveBasicList(
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]>
  abstract findActiveBasicListByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]>
  abstract searchActiveBasicList(
    keyword: string,
    limit?: number,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]>
  abstract findActiveByIds(
    organizationIds: string[],
    columns?: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]>
  abstract hasAnyActivePartnerByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<boolean>
  abstract paginateActiveBasicList(
    options: {
      page: number
      perPage: number
      search?: string
      organizationIds?: string[]
      plan?: string
      partnerType?: string
      partnerIsActive?: boolean
      createdAtStart?: string
      createdAtEnd?: string
    },
    transaction?: OrganizationTransaction
  ): Promise<{ organizations: OrganizationRecord[]; total: number }>
  abstract paginateByUser(
    userId: string,
    options: {
      page: number
      limit: number
      search?: string
      sortColumn?: string
      sortDirection?: 'asc' | 'desc'
      plan?: string
      partnerType?: string
      partnerIsActive?: boolean
      createdAtStart?: string
      createdAtEnd?: string
    },
    transaction?: OrganizationTransaction
  ): Promise<{ data: OrganizationBasicRecord[]; total: number }>
}

export abstract class OrganizationWriter {
  abstract create(
    data: Record<string, unknown>,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract findActiveForUpdate(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract update(
    organizationId: string,
    data: Record<string, unknown>,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract updateOwner(
    organizationId: string,
    ownerId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract softDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord>
  abstract hardDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord>
}

export abstract class OrganizationMembershipRepository {
  abstract find(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord | null>
  abstract findPending(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord | null>
  abstract getContext(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction,
    approvedOnly?: boolean
  ): Promise<MembershipContext>
  abstract findApprovedContext(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<MembershipContext>
  abstract findFirstApprovedContext(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<MembershipContext>
  abstract isApprovedMember(
    userId: string,
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean>
  abstract isMember(
    userId: string,
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean>
  abstract ensureApprovedMember(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<void>
  abstract listByUser(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord[]>
  abstract listMemberUserIds(
    organizationId: string,
    status?: string | null,
    transaction?: OrganizationTransaction
  ): Promise<string[]>
  abstract listSummariesByUser(
    userId: string,
    options?: { approvedOnly?: boolean },
    transaction?: OrganizationTransaction
  ): Promise<OrganizationSummaryRecord[]>
  abstract findOwnerOrganizationIds(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<string[]>
  abstract findPendingInvitationsPageByUser(
    userId: string,
    input?: { page?: unknown; perPage?: unknown },
    transaction?: OrganizationTransaction
  ): Promise<{
    data: OrganizationInvitationRecord[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
  }>
  abstract countMembers(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<number>
  abstract countMembersByOrganizationIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<Map<string, number>>
  abstract getMembersPreview(
    organizationId: string,
    limit: number,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract paginateMembers(
    organizationId: string,
    options: {
      page: number
      limit: number
      orgRole?: string
      userIds?: string[]
      search?: string
      statusFilter?: string
      include?: ('activity' | 'audit')[]
      joinDateStart?: string
      joinDateEnd?: string
    },
    transaction?: OrganizationTransaction
  ): Promise<{ data: PaginatedOrganizationMemberRecord[]; total: number }>
  abstract findMembersWithUser(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract findMembersWithUserBySearch(
    organizationId: string,
    search: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract findMembersWithUserByIds(
    organizationId: string,
    userIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract findMembersExcludingUser(
    organizationId: string,
    excludedUserId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract findPendingMembershipsWithUserInfo(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithUserRecord[]>
  abstract findPendingMembersWithDetails(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipWithOrganizationRecord[]>
  abstract countPendingMembers(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<number>
  abstract add(
    data: {
      organization_id: string
      user_id: string
      org_role: string
      status?: string
      invited_by?: string
    },
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipRecord>
  abstract updateRole(
    organizationId: string,
    userId: string,
    role: string,
    transaction?: OrganizationTransaction
  ): Promise<void>
  abstract updateStatus(
    organizationId: string,
    userId: string,
    status: 'pending' | 'approved' | 'rejected',
    transaction?: OrganizationTransaction
  ): Promise<number>
  abstract delete(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<void>
}

export abstract class OrganizationWorkHistoryReader {
  abstract listApprovedMembershipsByUser(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationMembershipHistoryFact[]>
  abstract listOrganizationNamesByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationNameFact[]>
}
