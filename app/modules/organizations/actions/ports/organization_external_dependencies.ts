import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


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

export interface OrganizationUserReaderWriter {
  findOwnerNamesByIds(
    userIds: string[],
    trx?: TransactionClientContract
  ): Promise<OrganizationOwnerName[]>

  findUserIdentity(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null>

  findUserByEmail(
    email: string,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null>

  isActiveUser(userId: string, trx?: TransactionClientContract): Promise<boolean>

  isSystemSuperadmin(userId: string, trx?: TransactionClientContract): Promise<boolean>

  updateCurrentOrganization(
    userId: string,
    organizationId: string | null,
    trx?: TransactionClientContract
  ): Promise<void>

  loadDebugOrganizations(userId: string): Promise<DebugUserOrganizationsInfo>
}

export interface OrganizationProjectTaskReaderWriter {
  countProjectsByOrganizationIds(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countTasksByOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<number>

  unassignMemberTasks(
    organizationId: string,
    userId: string,
    trx: TransactionClientContract
  ): Promise<void>
}

export interface OrganizationExternalDependencies {
  user: OrganizationUserReaderWriter
  projectTask: OrganizationProjectTaskReaderWriter
}
