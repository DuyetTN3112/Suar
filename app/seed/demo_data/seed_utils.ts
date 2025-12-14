import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import mongoose from 'mongoose'

import type { SeedRow, SeedWhereValue } from './types.js'

import { MongoAuditLogModel } from '#modules/audit/infra/models/audit_log'
import MongoNotification from '#modules/notifications/infra/models/notification'
import MongoUserActivityLog from '#modules/user_activity/infra/models/user_activity_log'
import env from '#start/env'


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

export async function deleteTableIfExists(trx: TransactionClientContract, table: string): Promise<void> {
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
    'task_required_skills',
    'task_versions',
    'task_assignments',
    'task_applications',
    'project_attachments',
    'project_members',
    'tasks',
    'task_workflow_transitions',
    'task_statuses',
    'organization_users',
    'projects',
    'organizations',
    'user_oauth_providers',
    'skills',
    'remember_me_tokens',
    'users',
  ]

  for (const table of tables) {
    await deleteTableIfExists(trx, table)
  }
}

export async function resetMongo(): Promise<void> {
  if (!env.get('MONGODB_URL', '')) {
    return
  }

  await Promise.all([
    MongoNotification.deleteMany({}),
    MongoAuditLogModel.deleteMany({}),
    MongoUserActivityLog.deleteMany({}),
  ])
}

export async function ensureMongoConnection(): Promise<void> {
  const mongoUrl = env.get('MONGODB_URL', '')
  if (!mongoUrl) {
    return
  }

  const connection = mongoose.connection
  const readyState = connection.readyState as 0 | 1 | 2 | 3

  if (readyState === 1) {
    return
  }

  if (readyState === 2) {
    await connection.asPromise()
    return
  }

  await mongoose.connect(mongoUrl)
}

export async function closeSeedConnections(): Promise<void> {
  const connection = mongoose.connection
  const readyState = connection.readyState as 0 | 1 | 2 | 3

  if (readyState === 1 || readyState === 2) {
    await mongoose.disconnect()
  }

  await db.manager.closeAll()
}
