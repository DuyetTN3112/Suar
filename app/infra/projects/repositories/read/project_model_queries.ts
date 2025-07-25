import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { getExtraNumber } from './shared.js'

import BusinessLogicException from '#exceptions/business_logic_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { ProjectInfraMapper } from '#infra/projects/mapper/project_infra_mapper'
import Project from '#infra/projects/models/project'
import type { DatabaseId } from '#types/database'
import type { ProjectDetailRecord } from '#types/project_records'


export const findDetailWithRelations = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<Project> => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  return query
    .where('id', projectId)
    .whereNull('deleted_at')
    .preload('creator')
    .preload('manager')
    .preload('owner')
    .preload('organization')
    .firstOrFail()
}

export const findDetailWithRelationsRecord = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<ProjectDetailRecord> => {
  const project = await findDetailWithRelations(projectId, trx)
  return ProjectInfraMapper.toDetailRecord(project)
}

export const findActiveOrFail = async (projectId: DatabaseId, trx?: TransactionClientContract) => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const project = await query.where('id', projectId).whereNull('deleted_at').first()

  if (!project) {
    throw new NotFoundException('Project không tồn tại')
  }
  return project
}

export const validateBelongsToOrg = async (
  projectId: DatabaseId,
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> => {
  const project = await findActiveOrFail(projectId, trx)

  if (project.organization_id !== organizationId) {
    throw new BusinessLogicException('Project and task must belong to the same organization')
  }
}

export const findIdsByOrganization = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<string[]> => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const projects = await query
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .select('id')
  return projects.map((project) => project.id)
}

export const listSimpleByOrganization = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<{ id: string; name: string }[]> => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const projects = await query
    .where('organization_id', organizationId)
    .whereNull('deleted_at')
    .orderBy('name', 'asc')
    .select('id', 'name')

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
  }))
}

export const countByOrgIds = async (
  orgIds: DatabaseId[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  if (orgIds.length === 0) {
    return new Map()
  }

  const query = trx ? Project.query({ client: trx }) : Project.query()
  const results = await query
    .whereIn('organization_id', orgIds)
    .whereNull('deleted_at')
    .select('organization_id')
    .count('* as total')
    .groupBy('organization_id')

  const map = new Map<string, number>()
  for (const row of results) {
    map.set(row.organization_id, getExtraNumber(row, 'total'))
  }
  return map
}
