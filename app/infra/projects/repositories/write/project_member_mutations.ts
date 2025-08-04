import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import ProjectMember from '#infra/projects/models/project_member'
import type { DatabaseId } from '#types/database'

export const addMember = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  projectRole: string,
  trx?: TransactionClientContract
): Promise<ProjectMember> => {
  return ProjectMember.create(
    {
      project_id: projectId,
      user_id: userId,
      project_role: projectRole,
    },
    trx ? { client: trx } : undefined
  )
}

export const updateRole = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  newRole: string,
  trx?: TransactionClientContract
): Promise<void> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .update({ project_role: newRole })
}

export const deleteMember = async (
  projectId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query
    .where('project_id', projectId)
    .where('user_id', userId)
    .delete()) as number[]
}

export const removeAllByProject = async (
  projectId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query.where('project_id', projectId).delete()) as number[]
}

export const removeAllByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<number[]> => {
  const query = trx ? ProjectMember.query({ client: trx }) : ProjectMember.query()
  return (await query.where('user_id', userId).delete()) as number[]
}
