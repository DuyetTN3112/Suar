import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { approveMembershipInternal } from '../commands/approve_membership.js'
import GetDebugOrganizationInfoQuery from '../queries/get_debug_organization_info_query.js'
import GetOrganizationMembersApiQuery from '../queries/get_organization_members_api_query.js'
import GetUserOwnedOrganizationsQuery from '../queries/get_user_owned_organizations_query.js'
import GetUsersInOrganizationQuery from '../queries/get_users_in_organization_query.js'

import { hasOrgPermission } from '#modules/authorization/constants/permissions'
import cacheService from '#modules/cache/infra/cache_service'
import { canAccessOrganizationAdminShell } from '#modules/organizations/domain/org_permission_policy'
import type { OrgRole } from '#modules/organizations/domain/org_types'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import type { PolicyResult } from '#modules/policies/domain/policy_result'
import type { DatabaseId } from '#types/database'


export class OrganizationPublicApi {
  async ensureActiveOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await OrganizationRepository.findActiveOrFail(organizationId, trx)
  }

  async isApprovedMember(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return membershipQueries.isApprovedMember(userId, organizationId, trx)
  }

  async getMembershipContext(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract,
    approvedOnly = true
  ) {
    return membershipQueries.getMembershipContext(organizationId, userId, trx, approvedOnly)
  }

  async findApprovedMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return membershipQueries.findApprovedMembershipContext(organizationId, userId, trx)
  }

  async findFirstApprovedMembership(userId: DatabaseId, trx?: TransactionClientContract) {
    return membershipQueries.findFirstApprovedMembershipContext(userId, trx)
  }

  async checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const membership = await this.getMembershipContext(organizationId, userId, trx, true)
    if (!membership) return false
    return hasOrgPermission(membership.role, permission)
  }

  canAccessAdminShell(actorOrgRole: OrgRole | null): PolicyResult {
    return canAccessOrganizationAdminShell(actorOrgRole)
  }

  async invalidatePermissionCache(organizationId: DatabaseId): Promise<void> {
    await cacheService.deleteByPattern(`perm:org:${organizationId}:*`)
  }

  async ensureApprovedMember(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await membershipQueries.findApprovedMemberOrFail(organizationId, userId, trx)
  }

  async listMembershipsByUser(userId: DatabaseId, trx?: TransactionClientContract) {
    return membershipQueries.listMembershipsByUser(userId, trx)
  }

  async hasAnyActivePartnerByIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return OrganizationRepository.hasAnyActivePartnerByIds(organizationIds, trx)
  }

  async findMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return membershipQueries.findMembership(organizationId, userId, trx)
  }

  async approveMembership(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await approveMembershipInternal(organizationId, userId, trx)
  }

  async listPendingMembershipsWithUserInfo(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    return listingQueries.findPendingMembershipsWithUserInfo(organizationId, trx)
  }

  async countPendingMembers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return listingQueries.countPendingMembers(organizationId, trx)
  }

  async getUsersInOrganization(organizationId: DatabaseId, excludeUserId: DatabaseId) {
    return new GetUsersInOrganizationQuery().execute(organizationId, excludeUserId)
  }

  async getDebugOrganizationInfo(userId: DatabaseId, sessionOrgId: string | undefined) {
    return GetDebugOrganizationInfoQuery.execute(userId, sessionOrgId)
  }

  async getOrganizationMembersApi(rawId: string) {
    return new GetOrganizationMembersApiQuery().execute(rawId)
  }

  async listUserOwnedOrganizations(userId: DatabaseId) {
    return GetUserOwnedOrganizationsQuery.execute(userId)
  }
}

export const organizationPublicApi = new OrganizationPublicApi()
