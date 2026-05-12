import * as accessQueries from './read/access_queries.js'
import * as projectMemberQueries from './read/project_member_queries.js'
import * as modelQueries from './read/project_model_queries.js'
import * as projectMemberMutations from './write/project_member_mutations.js'
import * as projectMutations from './write/project_mutations.js'

import { ProjectInfraMapper } from '#infra/projects/mapper/project_infra_mapper'
import type { ProjectDetailRecord, ProjectRecord } from '#types/project_records'

// Seal barrel: map Lucid models to plain records before returning to action layer
const findDetailWithRelationsAsRecord = async (...args: Parameters<typeof modelQueries.findDetailWithRelations>) => {
  const model = await modelQueries.findDetailWithRelations(...args)
  return ProjectInfraMapper.toDetailRecord(model)
}

const findActiveOrFailAsRecord = async (...args: Parameters<typeof modelQueries.findActiveOrFail>) => {
  const model = await modelQueries.findActiveOrFail(...args)
  return ProjectInfraMapper.toRecord(model)
}

const findIdsByOrganizationAsRecords = async (...args: Parameters<typeof modelQueries.findIdsByOrganization>) => {
  return modelQueries.findIdsByOrganization(...args) // Already returns string[]
}

const listSimpleByOrganizationAsRecords = async (...args: Parameters<typeof modelQueries.listSimpleByOrganization>) => {
  return modelQueries.listSimpleByOrganization(...args) // Already returns plain objects
}

const countByOrgIdsAsMap = async (...args: Parameters<typeof modelQueries.countByOrgIds>) => {
  return modelQueries.countByOrgIds(...args) // Returns Map
}

const lockForUpdateAsRecord = async (
  ...args: Parameters<typeof projectMutations.lockForUpdate>
): Promise<ProjectRecord> => {
  const model = await projectMutations.lockForUpdate(...args)
  return ProjectInfraMapper.toRecord(model)
}

const createAsRecord = async (
  ...args: Parameters<typeof projectMutations.create>
): Promise<ProjectRecord> => {
  const model = await projectMutations.create(...args)
  return ProjectInfraMapper.toRecord(model)
}

const updateByIdAsRecord = async (
  ...args: Parameters<typeof projectMutations.updateById>
): Promise<ProjectRecord> => {
  const model = await projectMutations.updateById(...args)
  return ProjectInfraMapper.toRecord(model)
}

const updateOwnerAsRecord = async (
  ...args: Parameters<typeof projectMutations.updateOwner>
): Promise<ProjectRecord> => {
  const model = await projectMutations.updateOwner(...args)
  return ProjectInfraMapper.toRecord(model)
}

const softDeleteByIdAsRecord = async (
  ...args: Parameters<typeof projectMutations.softDeleteById>
): Promise<ProjectRecord> => {
  const model = await projectMutations.softDeleteById(...args)
  return ProjectInfraMapper.toRecord(model)
}

const hardDeleteByIdAsRecord = async (
  ...args: Parameters<typeof projectMutations.hardDeleteById>
): Promise<ProjectRecord> => {
  const model = await projectMutations.hardDeleteById(...args)
  return ProjectInfraMapper.toRecord(model)
}

const ProjectRepository = {
  ...accessQueries,
  ...projectMemberQueries,
  ...projectMutations,
  ...projectMemberMutations,
  // Override with sealed versions
  findDetailWithRelations: findDetailWithRelationsAsRecord,
  findActiveOrFail: findActiveOrFailAsRecord,
  findIdsByOrganization: findIdsByOrganizationAsRecords,
  listSimpleByOrganization: listSimpleByOrganizationAsRecords,
  countByOrgIds: countByOrgIdsAsMap,
  create: createAsRecord,
  lockForUpdate: lockForUpdateAsRecord,
  findActiveForUpdate: lockForUpdateAsRecord,
  updateById: updateByIdAsRecord,
  updateOwner: updateOwnerAsRecord,
  softDeleteById: softDeleteByIdAsRecord,
  hardDeleteById: hardDeleteByIdAsRecord,
  // From modelQueries
  validateBelongsToOrg: modelQueries.validateBelongsToOrg,
}

export type { ProjectDetailRecord, ProjectRecord }
export default ProjectRepository
