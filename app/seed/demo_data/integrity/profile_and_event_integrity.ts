import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedCopyCandidate } from '../seed_copy_guard.js'
import type { SeedContext } from '../types.js'

import {
  countRowsIfTableExists,
  countRowsWhere,
  fail,
  tableExists,
} from './seed_integrity_helpers.js'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'

export async function collectPersistedVisibleCopy(
  trx: TransactionClientContract
): Promise<SeedCopyCandidate[]> {
  const candidates: SeedCopyCandidate[] = []
  const sources: {
    table: string
    key: string
    columns: string[]
  }[] = [
    { table: 'users', key: 'email', columns: ['username', 'bio'] },
    { table: 'organizations', key: 'slug', columns: ['name', 'description'] },
    { table: 'projects', key: 'id', columns: ['name', 'description'] },
    {
      table: 'tasks',
      key: 'id',
      columns: ['title', 'description', 'context_background', 'complexity_notes'],
    },
    { table: 'notifications', key: 'id', columns: ['title', 'message'] },
    {
      table: 'review_sessions',
      key: 'id',
      columns: ['strengths_observed', 'areas_for_improvement'],
    },
    {
      table: 'review_disputes',
      key: 'id',
      columns: ['dispute_reason', 'final_rationale'],
    },
    { table: 'task_review_messages', key: 'id', columns: ['body'] },
    { table: 'sprint_review_dispute_comments', key: 'id', columns: ['body'] },
    { table: 'skills', key: 'skill_code', columns: ['description'] },
    { table: 'task_statuses', key: 'id', columns: ['description'] },
    {
      table: 'task_submissions',
      key: 'id',
      columns: ['summary', 'implementation_notes', 'known_limitations', 'test_notes'],
    },
    { table: 'task_comments', key: 'id', columns: ['body'] },
    { table: 'task_applications', key: 'id', columns: ['message'] },
    { table: 'sprint_manager_reviews', key: 'id', columns: ['comment'] },
    { table: 'sprint_environment_reviews', key: 'id', columns: ['comment'] },
    {
      table: 'sprint_reverse_review_workflows',
      key: 'id',
      columns: ['comment', 'final_rationale'],
    },
    { table: 'sprint_reverse_review_messages', key: 'id', columns: ['body'] },
    { table: 'sprint_review_disputes', key: 'id', columns: ['dispute_reason', 'final_rationale'] },
    { table: 'task_review_workflows', key: 'id', columns: ['final_rationale'] },
    { table: 'project_professional_role_skills', key: 'id', columns: ['notes'] },
    { table: 'project_sprints', key: 'id', columns: ['name', 'goal'] },
  ]

  for (const source of sources) {
    if (!(await tableExists(trx, source.table))) {
      continue
    }

    const rows = (await trx.from(source.table).select(source.key, ...source.columns)) as Record<
      string,
      unknown
    >[]
    for (const row of rows) {
      const sourceKey = row[source.key]
      const safeSourceKey =
        typeof sourceKey === 'string' || typeof sourceKey === 'number'
          ? String(sourceKey)
          : 'unknown'

      for (const column of source.columns) {
        const value = row[column]
        if (typeof value === 'string' && value.trim().length > 0) {
          candidates.push({
            source: `${source.table}.${column}`,
            key: safeSourceKey,
            text: value,
          })
        }
      }
    }
  }

  if (await tableExists(trx, 'tasks')) {
    const taskTagRows = (await trx.from('tasks').select('id', 'domain_tags')) as {
      id: string
      domain_tags: unknown
    }[]
    for (const row of taskTagRows) {
      const rawTags = row.domain_tags
      const tags: unknown[] = Array.isArray(rawTags)
        ? rawTags
        : typeof rawTags === 'string'
          ? (() => {
              try {
                const parsed: unknown = JSON.parse(rawTags)
                return Array.isArray(parsed) ? parsed.map((value: unknown) => value) : []
              } catch {
                return []
              }
            })()
          : []
      for (const tag of tags) {
        if (typeof tag === 'string' && tag.trim().length > 0) {
          candidates.push({ source: 'tasks.domain_tags', key: row.id, text: tag })
        }
      }
    }
  }

  return candidates
}

export async function assertProfileAndWorkHistoryIntegrity(
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const mainUser = context.users.owner
  const profileSnapshots = await countRowsIfTableExists(trx, 'user_profile_snapshots')
  const userSkills = await countRowsIfTableExists(trx, 'user_skills')
  if (profileSnapshots === 0 || userSkills === 0) {
    fail('missing linked profile data')
  }

  const usersWithCurrentSnapshots = (await trx
    .from('user_profile_snapshots')
    .where('is_current', true)
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  if (Number(usersWithCurrentSnapshots?.total ?? 0) !== Object.keys(context.users).length) {
    fail('every seeded user must have one current profile context snapshot')
  }

  const usersWithSkillProfiles = (await trx
    .from('user_skills')
    .groupBy('user_id')
    .havingRaw('COUNT(DISTINCT skill_id) >= 4')
    .count('* as grouped_total')) as { grouped_total: string | number }[]
  const usersWithPerformance = (await trx
    .from('user_performance_stats')
    .whereNull('period_start')
    .whereNull('period_end')
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  const usersWithExpertise = (await trx
    .from('user_domain_expertise')
    .countDistinct('user_id as total')
    .first()) as { total: string | number } | null
  if (
    usersWithSkillProfiles.length !== Object.keys(context.users).length ||
    Number(usersWithPerformance?.total ?? 0) !== Object.keys(context.users).length ||
    Number(usersWithExpertise?.total ?? 0) !== Object.keys(context.users).length
  ) {
    fail(
      `every seeded user needs a skill profile, performance aggregate, and domain expertise (skills=${usersWithSkillProfiles.length}, performance=${Number(usersWithPerformance?.total ?? 0)}, expertise=${Number(usersWithExpertise?.total ?? 0)}, users=${Object.keys(context.users).length})`
    )
  }

  const mainUserWorkHistory = await countRowsWhere(trx, 'user_work_history', {
    user_id: mainUser.id,
  })
  const completedAssignmentsWithoutWorkHistory = (await trx
    .from('task_assignments as ta')
    .leftJoin('user_work_history as uwh', (join) => {
      join.on('uwh.task_assignment_id', 'ta.id').andOn('uwh.user_id', 'ta.assignee_id')
    })
    .where('ta.assignment_status', 'completed')
    .whereNull('uwh.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const workHistoryWithoutCompletedAssignment = (await trx
    .from('user_work_history as uwh')
    .leftJoin('task_assignments as ta', (join) => {
      join
        .on('ta.id', 'uwh.task_assignment_id')
        .andOn('ta.assignee_id', 'uwh.user_id')
        .andOnVal('ta.assignment_status', 'completed')
    })
    .whereNull('ta.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    mainUserWorkHistory === 0 ||
    !context.snapshots['owner'] ||
    Number(completedAssignmentsWithoutWorkHistory?.total ?? 0) > 0 ||
    Number(workHistoryWithoutCompletedAssignment?.total ?? 0) > 0
  ) {
    fail(
      `work history must materialize every completed assignment for its assignee (main=${mainUserWorkHistory}, missing=${Number(completedAssignmentsWithoutWorkHistory?.total ?? 0)}, invalid=${Number(workHistoryWithoutCompletedAssignment?.total ?? 0)})`
    )
  }
}

export async function assertNotificationAndAuditIntegrity(
  trx: TransactionClientContract
): Promise<void> {
  const invalidNotifications = (await trx
    .from('notifications')
    .whereRaw('(is_read = false AND read_at IS NOT NULL) OR (is_read = true AND read_at IS NULL)')
    .count('* as total')
    .first()) as { total: string | number } | null
  const notificationCount = await countRowsIfTableExists(trx, 'notifications')
  const notificationLedgerCount = await countRowsIfTableExists(
    trx,
    'notification_acceptance_ledger'
  )
  const notificationOutboxCount = await countRowsIfTableExists(trx, 'notification_outbox')
  const nonCanonicalNotifications = (await trx
    .from('notifications')
    .whereNotIn('type', Object.values(BACKEND_NOTIFICATION_TYPES))
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidNotificationLedgerRows = (await trx
    .from('notification_acceptance_ledger as ledger')
    .leftJoin('notifications as notification', (join) => {
      join
        .on('notification.id', '=', 'ledger.notification_id')
        .andOn('notification.event_id', '=', 'ledger.event_id')
        .andOn('notification.user_id', '=', 'ledger.recipient_id')
        .andOn('notification.event_fingerprint', '=', 'ledger.event_fingerprint')
    })
    .where('ledger.terminal_state', 'active')
    .whereNull('notification.id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidRecipientStates = (await trx
    .from('notification_recipient_states as state')
    .whereRaw(
      `
      state.unread_count <> (
        SELECT COUNT(*)
        FROM notifications AS notification
        WHERE notification.user_id = state.recipient_id
          AND notification.is_read = false
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const notificationsMissingRecipientState = (await trx
    .from('notifications as notification')
    .leftJoin(
      'notification_recipient_states as state',
      'state.recipient_id',
      'notification.user_id'
    )
    .whereNull('state.recipient_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const invalidOutboxDestinations = (await trx
    .from('notification_outbox')
    .whereNotIn('destination', ['feed_search', 'unread_cache'])
    .count('* as total')
    .first()) as { total: string | number } | null

  if (
    notificationCount === 0 ||
    notificationLedgerCount !== notificationCount ||
    notificationOutboxCount !== notificationCount * 2 ||
    Number(invalidNotifications?.total ?? 0) > 0 ||
    Number(nonCanonicalNotifications?.total ?? 0) > 0 ||
    Number(invalidNotificationLedgerRows?.total ?? 0) > 0 ||
    Number(invalidRecipientStates?.total ?? 0) > 0 ||
    Number(notificationsMissingRecipientState?.total ?? 0) > 0 ||
    Number(invalidOutboxDestinations?.total ?? 0) > 0
  ) {
    fail(
      'notifications must be canonical and causally linked to ledger, unread state, and both projection outboxes'
    )
  }

  const auditRows = (await trx
    .from('audit_events')
    .select('id', 'event_hash', 'prev_hash')
    .orderBy('occurred_at', 'asc')
    .orderBy('id', 'asc')) as {
    id: string
    event_hash: string | null
    prev_hash: string | null
  }[]
  const auditChainBroken = auditRows.some((row, index) => {
    if (!row.event_hash) {
      return true
    }
    return index === 0 ? row.prev_hash !== null : row.prev_hash !== auditRows[index - 1]?.event_hash
  })
  const auditEventsMissingSystemScope = (await trx
    .from('audit_events as event')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'system'
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const auditActorsMissingUserScope = (await trx
    .from('audit_events as event')
    .whereNotNull('event.user_id')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'user'
          AND scope.user_id = event.user_id
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  const auditTargetsMissingOrganizationScope = (await trx
    .from('audit_events as event')
    .whereNotNull('event.target_org_id')
    .whereRaw(
      `
      NOT EXISTS (
        SELECT 1
        FROM audit_event_scopes AS scope
        WHERE scope.event_id = event.id
          AND scope.surface = 'organization'
          AND scope.organization_id = event.target_org_id
      )
    `
    )
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    auditRows.length === 0 ||
    auditChainBroken ||
    Number(auditEventsMissingSystemScope?.total ?? 0) > 0 ||
    Number(auditActorsMissingUserScope?.total ?? 0) > 0 ||
    Number(auditTargetsMissingOrganizationScope?.total ?? 0) > 0
  ) {
    fail('audit events must form a sealed hash chain with system, actor, and target scopes')
  }
}
