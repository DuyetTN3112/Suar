import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import UpsertUserPerformanceStatsCommand from '#actions/users/commands/upsert_user_performance_stats_command'
import UserPerformanceStat from '#models/user_performance_stat'
import UserWorkHistory from '#models/user_work_history'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

async function createWorkHistoryRow(input: {
  userId: string
  completedAt: DateTime
  taskType?: string | null
  difficulty?: string | null
  businessDomain?: string | null
  roleInTask?: string | null
  collaborationType?: string | null
  actualHours?: number | null
  overallQualityScore?: number | null
  wasOnTime?: boolean | null
  daysEarlyOrLate?: number | null
}) {
  await UserWorkHistory.create({
    id: randomUUID(),
    user_id: input.userId,
    task_id: randomUUID(),
    task_assignment_id: randomUUID(),
    organization_id: null,
    project_id: null,
    task_title: `Task ${Math.random().toString(36).slice(2, 8)}`,
    task_type: input.taskType ?? 'feature_development',
    business_domain: input.businessDomain ?? 'saas',
    problem_category: null,
    role_in_task: input.roleInTask ?? 'tech_lead',
    autonomy_level: null,
    collaboration_type: input.collaborationType ?? 'solo',
    tech_stack: [],
    domain_tags: [],
    difficulty: input.difficulty ?? 'hard',
    estimated_hours: 10,
    actual_hours: input.actualHours ?? 8,
    was_on_time: input.wasOnTime ?? true,
    days_early_or_late: input.daysEarlyOrLate ?? -1,
    measurable_outcomes: [],
    estimated_business_value: null,
    knowledge_artifacts: [],
    overall_quality_score: input.overallQualityScore ?? 4,
    skill_scores: [],
    evidence_links: [],
    is_featured: false,
    is_public: false,
    completed_at: input.completedAt,
  })
}

test.group('Integration | Upsert User Performance Stats', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates then updates the same lifetime stats row', async ({ assert }) => {
    const user = await UserFactory.create()
    user.trust_data = {
      current_tier_code: 'community',
      calculated_score: 62,
      raw_score: 62,
      total_verified_reviews: 2,
      last_calculated_at: DateTime.now().toISO(),
      performance_score: 81.5,
    }
    await user.save()

    await createWorkHistoryRow({
      userId: user.id,
      completedAt: DateTime.now().minus({ days: 9 }),
      actualHours: 5,
      overallQualityScore: 4,
    })
    await createWorkHistoryRow({
      userId: user.id,
      completedAt: DateTime.now().minus({ days: 4 }),
      actualHours: 7,
      overallQualityScore: 5,
      wasOnTime: false,
      daysEarlyOrLate: 2,
      roleInTask: 'mentor',
      collaborationType: 'pair',
      taskType: 'bug_fix',
      difficulty: 'medium',
      businessDomain: 'marketplace',
    })

    const command = new UpsertUserPerformanceStatsCommand(ExecutionContext.system(user.id))
    const firstResult = await command.handle({ userId: user.id })

    assert.equal(firstResult.totalTasksCompleted, 2)
    assert.equal(firstResult.performanceScore, 81.5)

    const firstStat = await UserPerformanceStat.query().where('user_id', user.id).first()
    assert.isNotNull(firstStat)
    if (!firstStat) {
      assert.fail('Expected lifetime performance stat to be created')
      return
    }

    assert.equal(firstStat.total_tasks_completed, 2)
    assert.equal(firstStat.total_hours_worked, 12)
    assert.equal(firstStat.performance_score, 81.5)
    assert.equal(firstStat.tasks_by_type.feature_development, 1)
    assert.equal(firstStat.tasks_by_type.bug_fix, 1)

    const latestRow = await UserWorkHistory.query()
      .where('user_id', user.id)
      .orderBy('completed_at', 'desc')
      .firstOrFail()
    latestRow.actual_hours = 10
    await latestRow.save()

    const secondResult = await command.handle({ userId: user.id })
    const stats = await UserPerformanceStat.query().where('user_id', user.id)

    assert.lengthOf(stats, 1)
    assert.equal(secondResult.statsId, firstStat.id)
    assert.equal(stats[0]?.total_hours_worked, 15)
  })

  test('scopes metrics by period when periodStart/periodEnd are provided', async ({ assert }) => {
    const user = await UserFactory.create()
    user.trust_data = {
      current_tier_code: 'community',
      calculated_score: 58,
      raw_score: 58,
      total_verified_reviews: 1,
      last_calculated_at: DateTime.now().toISO(),
      performance_score: 74,
    }
    await user.save()

    await createWorkHistoryRow({
      userId: user.id,
      completedAt: DateTime.fromISO('2026-01-05T10:00:00.000+07:00'),
      taskType: 'bug_fix',
      difficulty: 'easy',
      businessDomain: 'internal_tools',
      actualHours: 3,
      overallQualityScore: 3,
    })
    await createWorkHistoryRow({
      userId: user.id,
      completedAt: DateTime.fromISO('2026-03-10T10:00:00.000+07:00'),
      taskType: 'architecture_design',
      difficulty: 'hard',
      businessDomain: 'marketplace',
      actualHours: 11,
      overallQualityScore: 5,
    })

    const command = new UpsertUserPerformanceStatsCommand(ExecutionContext.system(user.id))
    const result = await command.handle({
      userId: user.id,
      periodStart: '2026-03-01T00:00:00.000+07:00',
      periodEnd: '2026-03-31T23:59:59.000+07:00',
    })

    const stat = await UserPerformanceStat.query()
      .where('user_id', user.id)
      .whereNotNull('period_start')
      .first()

    assert.equal(result.totalTasksCompleted, 1)
    assert.equal(result.performanceScore, 74)
    assert.isNotNull(stat)
    if (!stat) {
      assert.fail('Expected period-scoped performance stat to be created')
      return
    }

    assert.equal(stat.total_tasks_completed, 1)
    assert.equal(stat.total_hours_worked, 11)
    assert.equal(stat.tasks_by_type.architecture_design, 1)
    assert.equal(stat.tasks_by_domain.marketplace, 1)
    assert.equal(stat.tasks_by_difficulty.hard, 1)
  })
})
