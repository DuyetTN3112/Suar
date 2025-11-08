import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { OrganizationInfraMapper } from '#infra/organizations/mapper/organization_infra_mapper'
import Organization from '#infra/organizations/models/organization'
import type { DatabaseId } from '#types/database'
import type { OrganizationRecord } from '#types/organization_records'

export const findActiveForUpdate = async (
  orgId: DatabaseId,
  trx: TransactionClientContract
): Promise<Organization> => {
  return Organization.query({ client: trx })
    .where('id', orgId)
    .whereNull('deleted_at')
    .forUpdate()
    .firstOrFail()
}

export const findActiveForUpdateRecord = async (
  orgId: DatabaseId,
  trx: TransactionClientContract
): Promise<OrganizationRecord> => {
  const organization = await findActiveForUpdate(orgId, trx)
  return OrganizationInfraMapper.toRecord(organization)
}

export const create = async (
  data: Partial<Organization>,
  trx?: TransactionClientContract
): Promise<Organization> => {
  return Organization.create(data, trx ? { client: trx } : undefined)
}

export const createRecord = async (
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<OrganizationRecord> => {
  const organization = await create(data, trx)
  return OrganizationInfraMapper.toRecord(organization)
}

export const save = async (
  organization: Organization,
  trx?: TransactionClientContract
): Promise<Organization> => {
  if (trx) {
    organization.useTransaction(trx)
  }
  await organization.save()
  return organization
}

export const updateByIdRecord = async (
  orgId: DatabaseId,
  data: Record<string, unknown>,
  trx: TransactionClientContract
): Promise<OrganizationRecord> => {
  const organization = await findActiveForUpdate(orgId, trx)
  organization.merge(data)
  await organization.save()
  return OrganizationInfraMapper.toRecord(organization)
}

export const updateOwnerRecord = async (
  orgId: DatabaseId,
  ownerId: DatabaseId,
  trx: TransactionClientContract
): Promise<OrganizationRecord> => {
  return updateByIdRecord(orgId, { owner_id: ownerId }, trx)
}

export const hardDelete = async (
  organization: Organization,
  trx?: TransactionClientContract
): Promise<void> => {
  if (trx) {
    organization.useTransaction(trx)
  }
  await organization.delete()
}

export const softDeleteByIdRecord = async (
  orgId: DatabaseId,
  trx: TransactionClientContract,
  deletedAt: DateTime = DateTime.now()
): Promise<OrganizationRecord> => {
  const organization = await findActiveForUpdate(orgId, trx)
  organization.deleted_at = deletedAt
  await organization.save()
  return OrganizationInfraMapper.toRecord(organization)
}

export const hardDeleteByIdRecord = async (
  orgId: DatabaseId,
  trx: TransactionClientContract
): Promise<OrganizationRecord> => {
  const organization = await findActiveForUpdate(orgId, trx)
  await organization.delete()
  return OrganizationInfraMapper.toRecord(organization)
}
