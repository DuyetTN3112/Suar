import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { getExtraNumber } from './shared.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { ProjectInfraMapper } from '#modules/projects/infra/adapters/project-context/project_infra_mapper'
import Project from '#modules/projects/infra/models/project-context/project'
import type { ProjectRecord } from '#modules/projects/types/project_records'


export const findDetail = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<Project> => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  return query.where('id', projectId).whereNull('deleted_at').firstOrFail()
}

export const findDetailRecord = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<ProjectRecord> => {
  const project = await findDetail(projectId, trx)
  return ProjectInfraMapper.toRecord(project)
}

export const findActiveOrFail = async (projectId: string, trx?: TransactionClientContract) => {
  const query = trx ? Project.query({ client: trx }) : Project.query()
  const project = await query.where('id', projectId).whereNull('deleted_at').first()

  if (!project) {
    throw new NotFoundException('Project không tồn tại')
  }
  return project
}

export const validateBelongsToOrg = async (
  projectId: string,
  organizationId: string,
  trx?: TransactionClientContract
): Promise<void> => {
  const project = await findActiveOrFail(projectId, trx)

  if (project.organization_id !== organizationId) {
    throw new BusinessLogicException('Project and task must belong to the same organization')
  }
}

export const findIdsByOrganization = async (
  organizationId: string,
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
  organizationId: string,
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

export const listSimpleByOrganizationForUser = async (
  organizationId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<
  Array<{
    id: string
    name: string
    creatorId: string | null
    managerId: string | null
    ownerId: string | null
    projectRole: string | null
  }>
> => {
  const client = trx ?? db
  const projects = (await client
    .from('projects as project')
    .leftJoin('project_members as project_member', (join) => {
      join
        .on('project_member.project_id', 'project.id')
        .andOnVal('project_member.user_id', userId)
    })
    .where('project.organization_id', organizationId)
    .whereNull('project.deleted_at')
    .where((scope) => {
      void scope
        .where('project.creator_id', userId)
        .orWhere('project.manager_id', userId)
        .orWhere('project.owner_id', userId)
        .orWhereNotNull('project_member.user_id')
    })
    .orderBy('project.name', 'asc')
    .select(
      'project.id',
      'project.name',
      'project.creator_id',
      'project.manager_id',
      'project.owner_id',
      'project_member.project_role'
    )) as Array<{
    id: string
    name: string
    creator_id: string | null
    manager_id: string | null
    owner_id: string | null
    project_role: string | null
  }>

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    creatorId: project.creator_id,
    managerId: project.manager_id,
    ownerId: project.owner_id,
    projectRole: project.project_role,
  }))
}

type ProjectSummaryQueryRecord = {
  id: string
  name: string
  owner_id: string | null
  visibility: 'public' | 'private' | 'team'
  allow_external_contributors: boolean
}

export const findSummariesByIds = async (
  projectIds: string[],
  trx?: TransactionClientContract
): Promise<ProjectSummaryQueryRecord[]> => {
  const uniqueIds = [...new Set(projectIds)]
  if (uniqueIds.length === 0) {
    return []
  }

  const query = trx ? Project.query({ client: trx }) : Project.query()
  const projects = await query
    .whereIn('id', uniqueIds)
    .whereNull('deleted_at')
    .select('id', 'name', 'owner_id', 'visibility', 'allow_external_contributors')

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    owner_id: project.owner_id,
    visibility: project.visibility,
    allow_external_contributors: project.allow_external_contributors,
  }))
}

export const countByOrgIds = async (
  orgIds: string[],
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

export const countAllByOrgIds = async (
  orgIds: string[],
  trx?: TransactionClientContract
): Promise<Map<string, number>> => {
  if (orgIds.length === 0) {
    return new Map()
  }

  const query = trx ? Project.query({ client: trx }) : Project.query()
  const results = await query
    .whereIn('organization_id', orgIds)
    .select('organization_id')
    .count('* as total')
    .groupBy('organization_id')

  const map = new Map<string, number>()
  for (const row of results) {
    map.set(row.organization_id, getExtraNumber(row, 'total'))
  }

  return map
}
