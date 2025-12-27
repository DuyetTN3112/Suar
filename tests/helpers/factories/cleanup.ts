import db from '@adonisjs/lucid/services/db'

import { assertSafeTestDatastores } from '../test_datastore_guard.js'


export async function cleanupTestData(): Promise<void> {
  await assertSafeTestDatastores()

  // PG operational tables (Mongo-era data now lives in PostgreSQL)
  await db.from('audit_events').delete()
  await db.from('notifications').delete()
  await db.from('user_activity_events').delete()
  await db.from('error_events').delete()

  await db.from('flagged_reviews').delete()
  await db.from('ai_dispute_feedback').delete()
  await db.from('ai_dispute_evaluations').delete()
  await db.from('review_dispute_case_files').delete()
  await db.from('review_dispute_evidences').delete()
  await db.from('review_dispute_comments').delete()
  await db.from('review_disputes').delete()
  await db.from('reverse_reviews').delete()
  await db.from('skill_reviews').delete()
  await db.from('review_sessions').delete()
  await db.from('user_profile_snapshots').delete()
  await db.from('user_work_history').delete()
  await db.from('user_domain_expertise').delete()
  await db.from('user_performance_stats').delete()
  await db.from('user_skills').delete()
  await db.from('recruiter_bookmarks').delete()
  await db.from('user_subscriptions').delete()
  await db.from('task_required_skills').delete()
  await db.from('task_versions').delete()
  await db.from('task_assignments').delete()
  await db.from('task_applications').delete()
  await db.from('project_attachments').delete()
  await db.from('project_members').delete()
  await db.from('projects').delete()
  await db.from('tasks').delete()
  await db.from('task_workflow_transitions').delete()
  await db.from('task_statuses').delete()
  await db.from('organization_users').delete()
  await db.from('organizations').delete()
  await db.from('user_oauth_providers').delete()
  await db.from('skills').delete()
  await db.from('users').delete()
}
