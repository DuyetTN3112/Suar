import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { listAuditLogsByEntity } from '#composition/admin/audit/audit_read_composition'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import ProjectSprint from '#modules/reviews/infra/models/sprint-review/project_sprint'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export function makeContext(userId: string | null, organizationId: string | null) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

export const reviewCryptography = new NodeReviewCryptography()
export const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()

export interface SprintReviewPackageRow {
  id: string
  reviewer_id: string
  status?: string
  submitted_at?: unknown
}

export interface ReverseReviewTargetStatsRow {
  total_reviews: number | string
  average_rating: number | string
  anonymous_reviews: number | string
}

export async function markSprintReverseReviewWorkflowsDone(sprintId: string) {
  await db.from('sprint_reverse_review_workflows').where('sprint_id', sprintId).update({
    status: 'done',
    accepted_at: '2026-07-14T03:00:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
}

export function configureCloseProjectSprintReviewTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
  each: { teardown: (fn: () => Promise<void>) => void }
}) {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())
}

export {
  cleanupTestData,
  CloseProjectSprintReviewCommand,
  DateTime,
  db,
  listAuditLogsByEntity,
  NotificationFanoutStagerContract,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  setupApp,
  TaskAssignmentFactory,
  TaskFactory,
  teardownApp,
  testId,
  UserFactory,
}
