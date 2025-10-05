import db from '@adonisjs/lucid/services/db'
import Redis from '@adonisjs/redis/services/main'

import { assertSafeTestDatastores } from '../test_datastore_guard.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'

export async function cleanupTestData(): Promise<void> {
  await assertSafeTestDatastores()

  async function deleteIfTableExists(tableName: string): Promise<void> {
    const exists = await db
      .from('information_schema.tables')
      .where('table_schema', 'public')
      .where('table_name', tableName)
      .first() as { table_name?: string } | undefined

    if (exists) {
      await db.from(tableName).delete()
    }
  }

  // PG operational tables (Mongo-era data now lives in PostgreSQL)
  await db.from('audit_events').delete()
  await db.from('notifications').delete()
  await db.from('user_activity_events').delete()
  await db.from('error_events').delete()

  await db.from('flagged_reviews').delete()
  await db.from('ai_dispute_feedback').delete()
  await db.from('ai_dispute_evaluations').delete()
  await deleteIfTableExists('sprint_review_dispute_comments')
  await deleteIfTableExists('sprint_review_disputes')
  await db.from('review_dispute_case_files').delete()
  await db.from('review_dispute_evidences').delete()
  await db.from('review_dispute_comments').delete()
  await db.from('review_disputes').delete()
  await db.from('public.reverse_review_target_stats').delete()
  await deleteIfTableExists('sprint_reverse_review_messages')
  await deleteIfTableExists('sprint_reverse_review_workflows')
  await deleteIfTableExists('sprint_environment_reviews')
  await deleteIfTableExists('sprint_manager_reviews')
  await deleteIfTableExists('sprint_review_packages')
  await deleteIfTableExists('project_sprints')
  await db.from('reverse_reviews').delete()
  await deleteIfTableExists('skill_review_evidence_links')
  await db.from('skill_reviews').delete()
  await deleteIfTableExists('review_evidences')
  await db.from('review_session_reviewer_assignments').delete()
  await db.from('review_sessions').delete()
  await db.from('user_profile_snapshots').delete()
  await db.from('user_work_history').delete()
  await db.from('user_domain_expertise').delete()
  await db.from('user_performance_stats').delete()
  await db.from('user_skills').delete()
  await db.from('recruiter_bookmarks').delete()
  await db.from('user_subscriptions').delete()
  await deleteIfTableExists('messages')
  await deleteIfTableExists('task_submission_evidences')
  await deleteIfTableExists('task_submissions')
  await deleteIfTableExists('task_comment_mentions')
  await deleteIfTableExists('task_comments')
  await deleteIfTableExists('task_attachments')
  await deleteIfTableExists('task_assignment_snapshots')
  await deleteIfTableExists('task_requirement_version_items')
  await deleteIfTableExists('task_requirement_versions')
  await db.from('task_required_skills').delete()
  await db.from('task_versions').delete()
  await deleteIfTableExists('task_review_messages')
  await deleteIfTableExists('task_review_reviewers')
  await deleteIfTableExists('task_review_workflows')
  await db.from('task_assignments').delete()
  await db.from('task_applications').delete()
  await db.from('project_attachments').delete()
  await db.from('project_members').delete()
  await deleteIfTableExists('marketplace_applications')
  await deleteIfTableExists('task_workflow_transitions')
  await db.from('tasks').delete()
  await db.from('task_statuses').delete()
  await deleteIfTableExists('project_professional_role_skills')
  await deleteIfTableExists('project_professional_roles')
  await deleteIfTableExists('project_skills')
  await deleteIfTableExists('skill_rubric_levels')
  await deleteIfTableExists('skill_rubric_versions')
  await deleteIfTableExists('skill_aliases')
  await db.from('projects').delete()
  await db.from('organization_users').delete()
  await db.from('organizations').delete()
  await db.from('user_oauth_providers').delete()
  await deleteIfTableExists('remember_me_tokens')
  await db.from('skills').delete()
  await db.from('users').delete()

  await cacheStore.flush()

  // Integration auth uses Redis-backed sessions in test runtime.
  // Clear Redis state as well so login/session context cannot leak across tests.
  await Promise.allSettled([
    Redis.connection('main').flushdb(),
    Redis.connection('cache').flushdb(),
  ])
}
