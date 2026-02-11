import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  userAccountRepository,
  userProfileRepository,
  userTransactionRunner,
} from '#composition/user_persistence_composition'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import RefreshUserProfileAggregatesCommand from '#modules/users/actions/commands/refresh_user_profile_aggregates_command'
import type { UserCompletedAssignmentFactReader } from '#modules/users/actions/ports/outbound/user_completed_assignment_fact_reader'
import type { UserProfileReviewFactReader } from '#modules/users/actions/ports/outbound/user_profile_review_fact_reader'
import type { UserSelfAssessmentAccuracyFactReader } from '#modules/users/actions/ports/outbound/user_self_assessment_accuracy_fact_reader'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import UserDomainExpertise from '#modules/users/infra/models/user_domain_expertise'
import UserPerformanceStat from '#modules/users/infra/models/user_performance_stat'
import UserWorkHistory from '#modules/users/infra/models/user_work_history'
import { lockUserProfileAggregateRefresh } from '#modules/users/infra/repositories/write/user_profile_aggregate_lock'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

interface CountRow {
  total: string | number
}

async function countProfileAggregateAuditRows(userId: string): Promise<number> {
  const rows = (await db
    .from('audit_events')
    .where('entity_id', userId)
    .whereIn('action', [
      'build_user_work_history',
      'upsert_user_performance_stats',
      'upsert_user_domain_expertise',
      'refresh_user_profile_aggregates',
    ])
    .count('* as total')) as CountRow[]

  return Number(rows[0]?.total ?? 0)
}

test.group('Integration | Refresh user profile aggregates atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('a final aggregate failure rolls back work history and performance writes', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const existingHistory = await UserWorkHistory.create({
      id: randomUUID(),
      user_id: user.id,
      task_id: randomUUID(),
      task_assignment_id: randomUUID(),
      organization_id: null,
      project_id: null,
      task_title: 'Legacy history',
      task_type: 'feature_development',
      business_domain: 'saas',
      problem_category: 'new_capability',
      role_in_task: 'lead',
      autonomy_level: 'autonomous',
      collaboration_type: 'solo',
      tech_stack: ['TypeScript'],
      domain_tags: ['platform'],
      difficulty: 'hard',
      estimated_hours: 8,
      actual_hours: 7,
      was_on_time: true,
      days_early_or_late: -1,
      measurable_outcomes: [],
      estimated_business_value: null,
      knowledge_artifacts: [],
      overall_quality_score: 4.5,
      skill_scores: [],
      evidence_links: [],
      is_featured: false,
      is_public: false,
      completed_at: DateTime.now().minus({ days: 2 }),
    })
    await db
      .from('user_work_history')
      .where('id', existingHistory.id)
      .update({
        tech_stack: db.raw('?::jsonb', [JSON.stringify('corrupt-persisted-array')]),
      })

    const newTaskId = randomUUID()
    const newAssignmentId = randomUUID()
    const completedAssignmentFactReader: UserCompletedAssignmentFactReader = {
      listCompletedAssignmentFacts: () =>
        Promise.resolve([
          {
            taskAssignmentId: newAssignmentId,
            taskId: newTaskId,
            organizationId: randomUUID(),
            projectId: null,
            taskTitle: 'New completed delivery',
            taskType: 'feature_development',
            businessDomain: 'marketplace',
            problemCategory: 'scalability',
            roleInTask: 'lead',
            autonomyLevel: 'autonomous',
            collaborationType: 'solo',
            techStack: ['PostgreSQL'],
            domainTags: ['data'],
            difficulty: 'hard',
            estimatedTime: 8,
            actualTime: 7,
            assignmentEstimatedHours: 8,
            assignmentActualHours: 7,
            dueDate: DateTime.now().minus({ days: 1 }).toISO(),
            completedAt: DateTime.now().minus({ hours: 12 }).toISO(),
            measurableOutcomes: [{ metric: 'latency', delta: -10 }],
            impactScope: 'organization',
          },
        ]),
    }
    const profileReviewFactReader: UserProfileReviewFactReader = {
      listProfileReviewFacts: () => Promise.resolve([]),
    }
    const selfAssessmentAccuracyFactReader: UserSelfAssessmentAccuracyFactReader = {
      listSelfAssessmentAccuracyFacts: () => Promise.resolve([]),
    }

    const command = new RefreshUserProfileAggregatesCommand(
      makeSystemUserActionContext(user.id),
      userTransactionRunner,
      userAccountRepository,
      userProfileRepository,
      completedAssignmentFactReader,
      profileReviewFactReader,
      selfAssessmentAccuracyFactReader
    )
    let thrown: unknown
    try {
      await command.handle({ userId: user.id })
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.equal((thrown as PersistedDataIntegrityException).code, 'E_PERSISTED_DATA_INTEGRITY')
    assert.equal(
      await UserWorkHistory.query()
        .where('user_id', user.id)
        .where('task_assignment_id', newAssignmentId)
        .count('* as total')
        .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
      0
    )
    assert.equal(
      await UserWorkHistory.query()
        .where('user_id', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
      1
    )
    assert.equal(
      await UserPerformanceStat.query()
        .where('user_id', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
      0
    )
    assert.equal(
      await UserDomainExpertise.query()
        .where('user_id', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
      0
    )
    assert.equal(
      await countProfileAggregateAuditRows(user.id),
      0
    )
  })

  test('serializes concurrent refreshes for the same user before reading source facts', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const blockingTransaction = await db.transaction()
    let completedFactReaderCalls = 0

    try {
      await lockUserProfileAggregateRefresh(user.id, blockingTransaction)

      const command = new RefreshUserProfileAggregatesCommand(
        makeSystemUserActionContext(user.id),
        userTransactionRunner,
        userAccountRepository,
        userProfileRepository,
        {
          listCompletedAssignmentFacts: () => {
            completedFactReaderCalls += 1
            return Promise.resolve([])
          },
        },
        {
          listProfileReviewFacts: () => Promise.resolve([]),
        },
        {
          listSelfAssessmentAccuracyFacts: () => Promise.resolve([]),
        }
      )
      const refreshPromise = command.handle({ userId: user.id })

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 50)
      })
      assert.equal(completedFactReaderCalls, 0)

      await blockingTransaction.commit()
      const result = await refreshPromise

      assert.equal(completedFactReaderCalls, 1)
      assert.equal(result.workHistory.totalCompletedAssignments, 0)
      assert.equal(
        await UserPerformanceStat.query()
          .where('user_id', user.id)
          .count('* as total')
          .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
        1
      )
      assert.equal(
        await UserDomainExpertise.query()
          .where('user_id', user.id)
          .count('* as total')
          .then((rows) => Number(rows[0]?.$extras['total'] ?? 0)),
        1
      )
      assert.equal(
        await countProfileAggregateAuditRows(user.id),
        4
      )
    } finally {
      if (!blockingTransaction.isCompleted) {
        await blockingTransaction.rollback()
      }
    }
  })
})
