import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { ProjectInfraMapper } from '#infra/projects/mapper/project_infra_mapper'
import Project from '#infra/projects/models/project'
import type { DatabaseId } from '#types/database'
import type { ProjectRecord } from '#types/project_records'

export const lockForUpdate = async (
  projectId: DatabaseId,
  trx: TransactionClientContract
): Promise<Project> => {
  return Project.query({ client: trx })
    .where('id', projectId)
    .whereNull('deleted_at')
    .forUpdate()
    .firstOrFail()
}

export const findActiveForUpdate = lockForUpdate

export const findActiveForUpdateRecord = async (
  projectId: DatabaseId,
  trx: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await lockForUpdate(projectId, trx)
  return ProjectInfraMapper.toRecord(project)
}

export const create = async (
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<Project> => {
  return Project.create(data, trx ? { client: trx } : undefined)
}

export const createRecord = async (
  data: Record<string, unknown>,
  trx?: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await create(data, trx)
  return ProjectInfraMapper.toRecord(project)
}

export const save = async (project: Project, trx?: TransactionClientContract): Promise<Project> => {
  if (trx) {
    project.useTransaction(trx)
  }
  await project.save()
  return project
}

export const updateById = async (
  projectId: DatabaseId,
  data: Record<string, unknown>,
  trx: TransactionClientContract
): Promise<Project> => {
  const project = await lockForUpdate(projectId, trx)
  project.merge(data)
  await project.save()
  return project
}

export const updateByIdRecord = async (
  projectId: DatabaseId,
  data: Record<string, unknown>,
  trx: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await updateById(projectId, data, trx)
  return ProjectInfraMapper.toRecord(project)
}

export const updateOwner = async (
  projectId: DatabaseId,
  ownerId: DatabaseId,
  trx: TransactionClientContract
): Promise<Project> => {
  return updateById(projectId, { owner_id: ownerId }, trx)
}

export const updateOwnerRecord = async (
  projectId: DatabaseId,
  ownerId: DatabaseId,
  trx: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await updateOwner(projectId, ownerId, trx)
  return ProjectInfraMapper.toRecord(project)
}

export const softDeleteById = async (
  projectId: DatabaseId,
  trx: TransactionClientContract,
  deletedAt: DateTime = DateTime.now()
): Promise<Project> => {
  const project = await lockForUpdate(projectId, trx)
  project.deleted_at = deletedAt
  await project.save()
  return project
}

export const softDeleteByIdRecord = async (
  projectId: DatabaseId,
  trx: TransactionClientContract,
  deletedAt: DateTime = DateTime.now()
): Promise<ProjectRecord> => {
  const project = await softDeleteById(projectId, trx, deletedAt)
  return ProjectInfraMapper.toRecord(project)
}

export const hardDelete = async (
  project: Project,
  trx?: TransactionClientContract
): Promise<void> => {
  if (trx) {
    project.useTransaction(trx)
  }
  await project.delete()
}

export const hardDeleteById = async (
  projectId: DatabaseId,
  trx: TransactionClientContract
): Promise<Project> => {
  const project = await lockForUpdate(projectId, trx)
  await project.delete()
  return project
}

export const hardDeleteByIdRecord = async (
  projectId: DatabaseId,
  trx: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await hardDeleteById(projectId, trx)
  return ProjectInfraMapper.toRecord(project)
}
