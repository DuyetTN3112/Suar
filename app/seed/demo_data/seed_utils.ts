import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRow, SeedWhereValue } from './types.js'

export type SeedQuery = ReturnType<TransactionClientContract['from']>

export function applyWhere(query: SeedQuery, where: Record<string, SeedWhereValue>): SeedQuery {
  for (const [key, value] of Object.entries(where)) {
    if (value === null) {
      void query.whereNull(key)
      continue
    }
    void query.where(key, value)
  }
  return query
}

export async function findRow<T extends SeedRow = SeedRow>(
  trx: TransactionClientContract,
  table: string,
  where: Record<string, SeedWhereValue>
): Promise<T | null> {
  return (await applyWhere(trx.from(table), where).first()) as T | null
}

export async function deleteTableIfExists(
  trx: TransactionClientContract,
  table: string
): Promise<void> {
  const exists = (await trx
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', table)
    .first()) as (Record<string, unknown> & { id: string }) | null

  if (!exists) {
    return
  }

  await trx.from(table).delete()
}

export async function resetPostgres(trx: TransactionClientContract): Promise<void> {
  const tables = [
    'flagged_reviews',
    'reverse_reviews',
    'skill_review_evidence_links',
    'skill_reviews',
    'review_evidences',
    'task_self_assessments',
    'review_sessions',
    'user_profile_snapshots',
    'user_work_history',
    'user_domain_expertise',
    'user_performance_stats',
    'user_skills',
    'recruiter_bookmarks',
    'user_subscriptions',
    'messages',
    'task_requirement_version_items',
    'task_requirement_versions',
    'task_required_skills',
    'task_versions',
    'task_assignments',
    'task_applications',
    'project_attachments',
    'project_members',
    'tasks',
    'task_workflow_transitions',
    'task_statuses',
    'project_professional_role_skills',
    'project_professional_roles',
    'professional_role_template_skills',
    'professional_role_templates',
    'project_skills',
    'skill_rubric_levels',
    'skill_rubric_versions',
    'skill_aliases',
    'organization_users',
    'projects',
    'organizations',
    'user_oauth_providers',
    'skills',
    'proficiency_levels',
    'proficiency_scales',
    'remember_me_tokens',
    'users',
  ]

  for (const table of tables) {
    await deleteTableIfExists(trx, table)
  }
}

export async function closeSeedConnections(): Promise<void> {
  await db.manager.closeAll()
}
