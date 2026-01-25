import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectMember from '#modules/projects/infra/models/project_member'

const resolveMutationArgs = (
  trxOrProjectProfessionalRoleId?: TransactionClientContract | string | null,
  maybeTrx?: TransactionClientContract
): {
  projectProfessionalRoleId: string | null
  trx: TransactionClientContract | undefined
} => {
  if (typeof trxOrProjectProfessionalRoleId === 'string' || trxOrProjectProfessionalRoleId === null) {
    return {
      projectProfessionalRoleId: trxOrProjectProfessionalRoleId ?? null,
      trx: maybeTrx,
    }
  }

  return {
    projectProfessionalRoleId: null,
    trx: trxOrProjectProfessionalRoleId,
  }
}

export const addMember = async (
  projectId: string,
  userId: string,
  projectRole: string,
  trxOrProjectProfessionalRoleId?: TransactionClientContract | string | null,
  maybeTrx?: TransactionClientContract
): Promise<ProjectMember> => {
  const { projectProfessionalRoleId, trx } = resolveMutationArgs(
    trxOrProjectProfessionalRoleId,
    maybeTrx
  )
  return ProjectMember.create(
    {
      project_id: projectId,
      user_id: userId,
      project_role: projectRole,
      project_professional_role_id: projectProfessionalRoleId ?? null,
    },
    trx ? { client: trx } : undefined
  )
}

export const updateRole = async (
  projectId: string,
  userId: string,
  newRole: string,
  trxOrProjectProfessionalRoleId?: TransactionClientContract | string | null,
  maybeTrx?: TransactionClientContract
): Promise<void> => {
  const { projectProfessionalRoleId, trx } = resolveMutationArgs(
    trxOrProjectProfessionalRoleId,
    maybeTrx
  )
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .update({
      project_role: newRole,
      project_professional_role_id: projectProfessionalRoleId ?? null,
    })
}

export const deleteMember = async (
  projectId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .delete()) as number[]
}

export const deleteMemberFromProjects = async (
  projectIds: string[],
  userId: string,
  trx: TransactionClientContract
): Promise<number[]> => {
  if (projectIds.length === 0) {
    return []
  }

  return (await ProjectMember.query({ client: trx })
    .whereIn('project_id', projectIds)
    .where('user_id', userId)
    .delete()) as number[]
}

export const removeAllByProject = async (
  projectId: string,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query.where('project_id', projectId).delete()) as number[]
}

export const removeAllByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query.where('user_id', userId).delete()) as number[]
}
