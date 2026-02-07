import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export interface OrganizationOwnerName {
  id: DatabaseId
  username: string
}

export interface OrganizationUserIdentity {
  id: DatabaseId
  email: string | null
  username: string
  current_organization_id?: DatabaseId | null
}

export interface DebugUserOrganizationsInfo {
  id: DatabaseId
  username: string | null
  currentOrganizationId: DatabaseId | null
  organizations: Record<string, unknown>[]
}

export interface OrganizationUserReaderWriter {
  findOwnerNamesByIds(
    userIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<OrganizationOwnerName[]>

  findUserIdentity(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null>

  findUserByEmail(
    email: string,
    trx?: TransactionClientContract
  ): Promise<OrganizationUserIdentity | null>

  isActiveUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean>

  updateCurrentOrganization(
    userId: DatabaseId,
    organizationId: DatabaseId | null,
    trx?: TransactionClientContract
  ): Promise<void>

  loadDebugOrganizations(userId: DatabaseId): Promise<DebugUserOrganizationsInfo>
}

export interface OrganizationProjectTaskReaderWriter {
  countProjectsByOrganizationIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<Map<string, number>>

  countTasksByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number>

  unassignMemberTasks(
    organizationId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void>
}

export interface OrganizationExternalDependencies {
  user: OrganizationUserReaderWriter
  projectTask: OrganizationProjectTaskReaderWriter
}
