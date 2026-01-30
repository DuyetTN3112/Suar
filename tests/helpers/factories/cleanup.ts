import db from '@adonisjs/lucid/services/db'
import Redis from '@adonisjs/redis/services/main'

import { assertSafeTestDatastores } from '../test_datastore_guard.js'

import { cacheStore } from '#modules/cache/public_contracts/cache_store'

const REDIS_TEST_CLEANUP_READY_TIMEOUT_MS = 2_000

async function flushRedisTestConnection(connectionName: 'main' | 'cache'): Promise<void> {
  const connection = Redis.connection(connectionName)
  if (!connection.isReady() && connection.status === 'connecting') {
    const ioConnection = connection.ioConnection
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: Error) => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timeout)
        ioConnection.off('ready', onReady)
        ioConnection.off('error', onError)
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }
      const onReady = () => finish()
      const onError = (error: Error) => finish(error)
      const timeout = setTimeout(
        () =>
          finish(
            new Error(
              `${connectionName} Redis did not become ready within ${REDIS_TEST_CLEANUP_READY_TIMEOUT_MS}ms`
            )
          ),
        REDIS_TEST_CLEANUP_READY_TIMEOUT_MS
      )

      ioConnection.once('ready', onReady)
      ioConnection.once('error', onError)
      if (connection.isReady()) {
        finish()
      }
    })
  }

  await connection.flushdb()
}

export async function cleanupTestData(): Promise<void> {
  await assertSafeTestDatastores()

  async function deleteIfTableExists(tableName: string): Promise<void> {
    const exists = (await db
      .from('information_schema.tables')
      .where('table_schema', 'public')
      .where('table_name', tableName)
      .first()) as { table_name?: string } | undefined

    if (exists) {
      await db.from(tableName).delete()
    }
  }

  // PG operational tables (Mongo-era data now lives in PostgreSQL)
  await deleteIfTableExists('domain_event_outbox_replay_history')
  await deleteIfTableExists('domain_event_outbox')
  await db.from('audit_events').delete()
  await deleteIfTableExists('notification_projection_deliveries')
  await deleteIfTableExists('notification_projection_targets')
  await deleteIfTableExists('notification_fanout_targets')
  await deleteIfTableExists('notification_fanout_jobs')
  await deleteIfTableExists('notification_outbox')
  await deleteIfTableExists('notification_tombstones')
  await deleteIfTableExists('notification_acceptance_ledger')
  await deleteIfTableExists('notification_recipient_states')
  await db.from('notifications').delete()
  await db.from('error_events').delete()

  await db.from('flagged_reviews').delete()
  await db.from('ai_dispute_feedback').delete()
  await deleteIfTableExists('ai_dispute_auto_queue_intents')
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

  // Domain-table DELETE triggers can enqueue invalidation intents while the
  // fixtures above are being removed. Clear them last so test readiness and
  // subsequent workers never observe cleanup-generated backlog.
  await deleteIfTableExists('cache_invalidation_outbox')

  try {
    await cacheStore.flush()
  } catch (error) {
    if (process.env['CACHE_CLEANUP_ALLOW_CACHE_OUTAGE'] !== '1') {
      throw error
    }
  }

  // Integration auth uses Redis-backed sessions in test runtime.
  // Clear Redis state as well so login/session context cannot leak across tests.
  const redisCleanupConnections = ['main', 'cache'] as const
  const redisCleanupResults = await Promise.allSettled(
    redisCleanupConnections.map((connection) => flushRedisTestConnection(connection))
  )
  const redisCleanupErrors = redisCleanupResults.flatMap((result, index) => {
    if (result.status !== 'rejected') {
      return []
    }

    const reason =
      result.reason instanceof Error
        ? `${result.reason.name}: ${result.reason.message}`
        : String(result.reason)
    const connectionName = redisCleanupConnections[index] ?? 'unknown'
    return [`${connectionName}: ${reason}`]
  })
  if (redisCleanupErrors.length > 0 && process.env['CACHE_CLEANUP_ALLOW_CACHE_OUTAGE'] !== '1') {
    throw new Error(
      `Failed to flush dedicated Redis test databases: ${redisCleanupErrors.join('; ')}`
    )
  }
}
