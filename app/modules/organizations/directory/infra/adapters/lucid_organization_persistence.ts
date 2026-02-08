import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationInfraMapper } from '../mapper/organization_infra_mapper.js'
import OrganizationRepository from '../repositories/read/organization_repository.js'
import * as organizationMutations from '../repositories/write/organization_mutations.js'

import type { OrganizationAdministrationRepository } from '#modules/organizations/access/actions/ports/outbound/organization_administration_repository'
import OrgAccessRepository from '#modules/organizations/access/infra/repositories/read/org_access_repository'
import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import type {
  OrganizationInvitationRecord,
  OrganizationMembershipRecord,
  OrganizationMembershipRepository,
  OrganizationMembershipWithOrganizationRecord,
  OrganizationMembershipWithUserRecord,
  OrganizationReader,
  OrganizationRecord,
  OrganizationSummaryRecord,
  OrganizationWorkHistoryReader,
  OrganizationWriter,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/directory/actions/ports/outbound/organization_transaction'
import OrganizationInvitationRepository from '#modules/organizations/invitations/infra/repositories/organization_invitation_repository'
import OrganizationMemberRepository from '#modules/organizations/members/infra/repositories/organization_member_repository'
import * as listingQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/members/infra/repositories/organization_user_repository/read/membership_queries'
import * as membershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import * as workHistoryQueries from '#modules/organizations/members/infra/repositories/read/organization_work_history_queries'

const asLucidTransaction = (
  transaction?: OrganizationTransaction
): TransactionClientContract | undefined => transaction as TransactionClientContract | undefined

const toDate = (value: { toJSDate(): Date } | Date | string | null | undefined): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string') {
    return new Date(value)
  }
  return value?.toJSDate() ?? new Date(0)
}

const toAggregateCount = (value: unknown): number => {
  if (typeof value !== 'object' || value === null || !('total' in value)) {
    return 0
  }

  return Number(value.total ?? 0)
}

const toMembershipRecord = (membership: {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: { toJSDate(): Date } | Date | string
  updated_at: { toJSDate(): Date } | Date | string
}): OrganizationMembershipRecord => ({
  organization_id: membership.organization_id,
  user_id: membership.user_id,
  org_role: membership.org_role,
  status: membership.status,
  invited_by: membership.invited_by,
  created_at: toDate(membership.created_at),
  updated_at: toDate(membership.updated_at),
})

const toMembershipWithUserRecord = (membership: {
  organization_id: string
  user_id: string
  org_role: string
  status: string
  invited_by: string | null
  created_at: { toJSDate(): Date } | Date | string
  updated_at: { toJSDate(): Date } | Date | string
  user: {
    id: string
    username: string
    email: string | null
    status: string
    system_role: string
    avatar_url: string | null
    created_at: { toJSDate(): Date } | Date | string
  }
}): OrganizationMembershipWithUserRecord => ({
  ...toMembershipRecord(membership),
  user: {
    ...membership.user,
    created_at: toDate(membership.user.created_at),
  },
})

export class LucidOrganizationReader implements OrganizationReader {
  async findActiveOrFail(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return OrganizationRepository.findActiveOrFailRecord(
      organizationId,
      asLucidTransaction(transaction)
    )
  }

  existsActive(organizationId: string, transaction?: OrganizationTransaction): Promise<boolean> {
    return OrganizationRepository.existsActive(organizationId, asLucidTransaction(transaction))
  }

  slugExists(slug: string, transaction?: OrganizationTransaction): Promise<boolean> {
    return OrganizationRepository.slugExists(slug, asLucidTransaction(transaction))
  }

  async findById(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord | null> {
    const organization = await OrganizationRepository.findById(
      organizationId,
      asLucidTransaction(transaction)
    )
    return organization ? OrganizationInfraMapper.toRecord(organization) : null
  }

  async findBasicInfo(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<{ id: string; name: string } | null> {
    const organization = await OrganizationRepository.findBasicInfo(
      organizationId,
      asLucidTransaction(transaction)
    )
    return organization ? { id: organization.id, name: organization.name } : null
  }

  async findAllActive(transaction?: OrganizationTransaction): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findAllActive(
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findAllActiveBasicList(
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findAllActiveBasicList(
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findActiveBasicListByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findActiveBasicListByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async searchActiveBasicList(
    keyword: string,
    limit?: number,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.searchActiveBasicList(
      keyword,
      limit,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findActiveByIds(
    organizationIds: string[],
    columns?: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findActiveByIds(
      organizationIds,
      columns,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  hasAnyActivePartnerByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<boolean> {
    return OrganizationRepository.hasAnyActivePartnerByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
  }

  async paginateActiveBasicList(
    options: Parameters<OrganizationReader['paginateActiveBasicList']>[0],
    transaction?: OrganizationTransaction
  ) {
    const result = await OrganizationRepository.paginateActiveBasicList(
      options,
      asLucidTransaction(transaction)
    )
    return {
      organizations: result.organizations.map((organization) =>
        OrganizationInfraMapper.toRecord(organization)
      ),
      total: result.total,
    }
  }

  paginateByUser(
    userId: string,
    options: Parameters<OrganizationReader['paginateByUser']>[1],
    transaction?: OrganizationTransaction
  ) {
    return OrganizationRepository.paginateByUser(userId, options, asLucidTransaction(transaction))
  }
}

export class LucidOrganizationWriter implements OrganizationWriter {
  create(
    data: Record<string, unknown>,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.createRecord(data, asLucidTransaction(transaction))
  }

  findActiveForUpdate(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.findActiveForUpdateRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  update(
    organizationId: string,
    data: Record<string, unknown>,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.updateByIdRecord(
      organizationId,
      data,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  updateOwner(
    organizationId: string,
    ownerId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.updateOwnerRecord(
      organizationId,
      ownerId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  softDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.softDeleteByIdRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }

  hardDelete(
    organizationId: string,
    transaction: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return organizationMutations.hardDeleteByIdRecord(
      organizationId,
      asLucidTransaction(transaction) as TransactionClientContract
    )
  }
}

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

export class LucidOrganizationWorkHistoryReader implements OrganizationWorkHistoryReader {
  listApprovedMembershipsByUser(userId: string, transaction?: OrganizationTransaction) {
    return workHistoryQueries.listApprovedMembershipsByUser(userId, asLucidTransaction(transaction))
  }

  listOrganizationNamesByIds(organizationIds: string[], transaction?: OrganizationTransaction) {
    return workHistoryQueries.listOrganizationNamesByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
  }
}

export class LucidOrganizationAdministrationRepository implements OrganizationAdministrationRepository {
  private readonly members = new OrganizationMemberRepository()
  private readonly invitations = new OrganizationInvitationRepository()

  listMembers(...args: Parameters<OrganizationMemberRepository['listMembers']>) {
    return this.members.listMembers(...args)
  }

  async getMemberStats(organizationId: string) {
    const approvedCount: Promise<unknown> = db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .count('* as total')
      .first()
    const pendingCount: Promise<unknown> = db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .whereNotNull('invited_by')
      .count('* as total')
      .first()

    const [approvedRaw, pendingRaw, byRole] = await Promise.all([
      approvedCount,
      pendingCount,
      this.getRoleDistribution(organizationId),
    ])

    return {
      total: toAggregateCount(approvedRaw),
      byRole: {
        org_owner: byRole.get('org_owner') ?? 0,
        org_admin: byRole.get('org_admin') ?? 0,
        org_member: byRole.get('org_member') ?? 0,
      },
      pendingInvitations: toAggregateCount(pendingRaw),
    }
  }

  async getRoleDistribution(organizationId: string): Promise<Map<string, number>> {
    const rows = (await db
      .from('organization_users')
      .select('org_role')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .groupBy('org_role')) as { org_role: string; total: number | string }[]

    return new Map(rows.map((row) => [row.org_role, Number(row.total)]))
  }

  listInvitations(...args: Parameters<OrganizationInvitationRepository['listInvitations']>) {
    return this.invitations.listInvitations(...args)
  }
}
