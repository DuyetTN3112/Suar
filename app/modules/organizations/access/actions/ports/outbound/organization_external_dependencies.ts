import type { OrganizationTransaction } from './organization_transaction.js'

export interface OrganizationOwnerName {
  id: string
  username: string
}

export interface OrganizationUserIdentity {
  id: string
  email: string | null
  username: string
  current_organization_id?: string | null
}

export interface DebugUserOrganizationsInfo {
  id: string
  username: string | null
  currentOrganizationId: string | null
  organizations: Record<string, unknown>[]
}

export abstract class OrganizationUserReaderWriter {
  abstract findOwnerNamesByIds(
    userIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationOwnerName[]>

  abstract findUserIdentity(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationUserIdentity | null>

  abstract findUserByEmail(
    email: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationUserIdentity | null>

  abstract isActiveUser(userId: string, transaction?: OrganizationTransaction): Promise<boolean>

  abstract isSystemSuperadmin(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean>

  abstract updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    transaction?: OrganizationTransaction
  ): Promise<void>

  abstract loadDebugOrganizations(userId: string): Promise<DebugUserOrganizationsInfo>
}
