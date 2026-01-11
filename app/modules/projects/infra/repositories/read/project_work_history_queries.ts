import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { ProjectVisibility } from '#modules/projects/public_contracts/project_constants'
import type { ProjectMembershipHistoryFact } from '#modules/projects/public_contracts/project_membership_history'

export const listMembershipsByUser = async (
  userId: string,
  options: { publicOnly: boolean },
  trx?: TransactionClientContract
): Promise<ProjectMembershipHistoryFact[]> => {
  const query = (trx ?? db)
    .from('project_members as pm')
    .join('projects as p', 'p.id', 'pm.project_id')
    .where('pm.user_id', userId)
    .whereNull('p.deleted_at')
    .select(
      'p.name as project_name',
      'p.organization_id',
      'pm.project_role',
      'p.start_date',
      'p.end_date',
      'p.visibility'
    )
    .orderBy('pm.created_at', 'desc')

  if (options.publicOnly) {
    void query.where('p.visibility', ProjectVisibility.PUBLIC)
  }

  return query
}
