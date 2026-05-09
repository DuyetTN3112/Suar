import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import type {
  DebugUserOrganizationsInfo,
  OrganizationOwnerName,
  OrganizationUserIdentity,
} from '#modules/organizations/actions/ports/outbound/directory/organization_external_dependencies'
import { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/directory/organization_external_dependencies'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import * as membershipQueries from '#modules/organizations/infra/repositories/members/organization_user_repository/read/membership_queries'

export class OrganizationUserReaderWriterAdapter extends OrganizationUserReaderWriter {
  async findOwnerNamesByIds(
    userIds: string[],
    trx?: OrganizationTransaction
  ): Promise<OrganizationOwnerName[]> {
    const users = await userPublicApi.findByIds(
      userIds,
      ['id', 'username'],
      trx
    )
    return users.map((user) => ({
      id: user.id,
      username: user.username,
    }))
  }

  async findUserIdentity(
    userId: string,
    trx?: OrganizationTransaction
  ): Promise<OrganizationUserIdentity | null> {
    const user = await userPublicApi.findById(userId, trx)
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      current_organization_id: user.current_organization_id,
    }
  }

  async findUserByEmail(
    email: string,
    trx?: OrganizationTransaction
  ): Promise<OrganizationUserIdentity | null> {
    const user = await userPublicApi.findByEmail(
      email,
      trx
    )
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      current_organization_id: user.current_organization_id,
    }
  }

  async isActiveUser(userId: string, trx?: OrganizationTransaction): Promise<boolean> {
    return userPublicApi.isActive(userId, trx)
  }

  async isSystemSuperadmin(
    userId: string,
    trx?: OrganizationTransaction
  ): Promise<boolean> {
    return userPublicApi.isSystemSuperadmin(userId, trx)
  }

  async updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    trx?: OrganizationTransaction
  ): Promise<void> {
    await userPublicApi.updateCurrentOrganization(
      userId,
      organizationId,
      trx
    )
  }

  async loadDebugOrganizations(userId: string): Promise<DebugUserOrganizationsInfo> {
    const [user, organizations] = await Promise.all([
      userPublicApi.findNotDeletedOrFail(userId),
      membershipQueries.listOrganizationSummariesByUser(userId),
    ])

    return {
      id: user.id,
      username: user.username,
      currentOrganizationId: user.current_organization_id,
      organizations: organizations.map((organization) => ({ ...organization })),
    }
  }
}
