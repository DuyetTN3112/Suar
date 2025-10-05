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
    'audit_events',
    'notifications',
    'user_activity_events',
    'error_events',
    'ai_dispute_feedback',
    'ai_dispute_evaluations',
    'flagged_reviews',
    'sprint_review_dispute_comments',
    'sprint_review_disputes',
    'sprint_reverse_review_messages',
    'sprint_reverse_review_workflows',
    'sprint_environment_reviews',
    'sprint_manager_reviews',
    'sprint_review_packages',
    'project_sprints',
    'review_dispute_case_files',
    'review_dispute_evidences',
    'review_dispute_comments',
    'review_disputes',
    'reverse_review_target_stats',
    'reverse_reviews',
    'skill_review_evidence_links',
    'skill_reviews',
    'review_evidences',
    'review_session_reviewer_assignments',
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
    'task_submission_evidences',
    'task_submissions',
    'task_comment_mentions',
    'task_comments',
    'task_attachments',
    'task_assignment_snapshots',
    'task_requirement_version_items',
    'task_requirement_versions',
    'task_required_skills',
    'task_versions',
    'task_review_messages',
    'task_review_reviewers',
    'task_review_workflows',
    'task_assignments',
    'task_applications',
    'project_attachments',
    'project_members',
    'marketplace_applications',
    'task_workflow_transitions',
    'tasks',
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
