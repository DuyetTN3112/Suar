import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  getUserOwnedOrganizationsQuery,
  getUsersInOrganizationQuery,
} from '#composition/organizations/directory/organization_directory_query_composition'
import {
  organizationMembershipRepository,
  organizationReader,
} from '#composition/organizations/persistence/organization_persistence_composition'
import {
  ProjectOrganizationReader,
  type ProjectOrganizationSummary,
  type ProjectOrganizationUserOption,
  type ProjectOwnedOrganizationOption,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'

export class ProjectOrganizationReaderAdapter extends ProjectOrganizationReader {
  async findOrganizationSummary(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<ProjectOrganizationSummary | null> {
    const organization = await organizationReader.findById(organizationId, trx)
    if (!organization || organization.deleted_at) {
      return null
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
    }
  }

  async getMembershipRole(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const membership = await organizationMembershipRepository.findApprovedContext(
      organizationId,
      userId,
      trx
    )
    if (membership?.role) return membership.role

    // The organization owner is authoritative even if an old or imported
    // organization is missing its corresponding organization_users row.
    const organization = await organizationReader.findById(organizationId, trx)
    return organization?.owner_id === userId ? 'org_owner' : null
  }

  ensureApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    return organizationMembershipRepository.ensureApprovedMember(organizationId, userId, trx)
  }

  isApprovedMember(
    organizationId: string,
    userId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationMembershipRepository.isApprovedMember(userId, organizationId, trx)
  }

  listOwnedOrganizations(userId: string): Promise<ProjectOwnedOrganizationOption[]> {
    return getUserOwnedOrganizationsQuery.execute(userId)
  }

  listOrganizationUsers(
    organizationId: string,
    excludeUserId: string
  ): Promise<ProjectOrganizationUserOption[]> {
    return getUsersInOrganizationQuery.execute(organizationId, excludeUserId)
  }
}
