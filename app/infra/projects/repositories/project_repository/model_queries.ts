import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Project from '#models/project'
import NotFoundException from '#exceptions/not_found_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { getExtraNumber } from './shared.js'

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

export const findActiveOrFail = async (projectId: DatabaseId, trx?: TransactionClientContract) => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const project = await query.where('id', projectId).whereNull('deleted_at').first()

  if (!project) {
    throw new NotFoundException('Project không tồn tại')
  }
  return project
}

export const findActiveForUpdate = async (
  projectId: DatabaseId,
  trx: TransactionClientContract
) => {
  return Project.query({ client: trx })
    .where('id', projectId)
    .whereNull('deleted_at')
    .forUpdate()
    .firstOrFail()
}

export const create = async (
  data: Partial<Project>,
  trx?: TransactionClientContract
): Promise<Project> => {
  return Project.create(data, trx ? { client: trx } : undefined)
}

export const save = async (project: Project, trx?: TransactionClientContract): Promise<Project> => {
  if (trx) {
    project.useTransaction(trx)
  }
  await project.save()
  return project
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
): Promise<Array<{ id: string; name: string }>> => {
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

export const countTasksByOrganization = async (
  organizationId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number> => {
  const projectIds = await findIdsByOrganization(organizationId, trx)
  if (projectIds.length === 0) {
    return 0
  }

  const taskModule = await import('#models/task')
  const TaskModel = taskModule.default
  const query = trx ? TaskModel.query({ client: trx }) : TaskModel.query()
  const result = await query
    .whereIn('project_id', projectIds)
    .whereNull('deleted_at')
    .count('* as total')

  return getExtraNumber(result[0], 'total')
}
