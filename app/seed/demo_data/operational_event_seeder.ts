import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { seedOperationalAudits } from './operational_events/operational_audit_seeder.js'
import {
  seedOperationalNotifications,
  type SeedOperationalEventRuntime,
} from './operational_events/operational_notification_seeder.js'
import { logSummary } from './operational_events/operational_summary_logger.js'
import type { SeedContext } from './types.js'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'

export const OWNER_DEMO_OPERATIONAL_EVENT_TYPES = {
  notifications: [
    BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_RECEIVED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_APPROVED,
    BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_REJECTED,
    BACKEND_NOTIFICATION_TYPES.TASK_DUE_SOON,
    BACKEND_NOTIFICATION_TYPES.REVIEW_DISPUTE_ESCALATED,
    BACKEND_NOTIFICATION_TYPES.REVIEW_REQUESTED,
    BACKEND_NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
  ],
  auditActions: [
    'organization_workspace_initialized',
    'apply_marketplace_task',
    'process_marketplace_application',
    'complete_task',
    'dispute_review',
    'publish_profile_snapshot',
    'switch_organization_context',
  ],
  activityActions: [
    'switch_organization',
    'login',
    'view_marketplace',
    'apply_task',
    'view_profile',
  ],
} as const

export type { SeedOperationalEventRuntime }
export { logSummary }

/**
 * Seed the causal operational bundle through the same acceptance boundaries used
 * by live commands.
 */
export async function seedOperationalEvents(
  runtime: SeedOperationalEventRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  await seedOperationalNotifications(runtime, context, trx)
  await seedOperationalAudits(runtime, context, trx)
}
