import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import PublishUserProfileSnapshotCommand from '#actions/users/commands/publish_user_profile_snapshot_command'
import CacheService from '#infra/cache/cache_service'
import TaskAssignment from '#models/task_assignment'
import UserProfileSnapshot from '#models/user_profile_snapshot'
import UserWorkHistory from '#models/user_work_history'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

const cacheService = CacheService as unknown as {
  deleteByPattern: typeof CacheService.deleteByPattern
}

test.group('Integration | Publish User Profile Snapshot', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('publishes snapshot with version increment, current switch, and derived summary fields', async ({
    assert,
  }) => {
    const user = await UserFactory.create({
      username: 'snapshot-user',
      email: 'snapshot-user@example.com',
    })
    await user
      .merge({
        trust_data: {
          calculated_score: 81,
          current_tier_code: 'gold',
          raw_score: 81,
          total_verified_reviews: 3,
          last_calculated_at: DateTime.now().toISO(),
          performance_score: 88,
          scoring_version: 'v2',
        },
      })
      .save()
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    const task = await TaskFactory.create({
      creator_id: user.id,
      assigned_to: user.id,
      title: 'Delivered feature',
      difficulty: 'medium',
      estimated_time: 8,
      actual_time: 6,
      status: 'done',
    })
    await db
      .from('tasks')
      .where('id', task.id)
      .update({
        updated_at: DateTime.now().toSQL(),
        task_type: 'feature_development',
        business_domain: 'saas',
        problem_category: 'new_capability',
        role_in_task: 'lead',
        collaboration_type: 'solo',
        autonomy_level: 'autonomous',
        tech_stack: JSON.stringify(['ts', 'node']),
        domain_tags: JSON.stringify(['platform', 'delivery']),
      })
    await task.refresh()
    const assignment = await TaskAssignment.create({
      task_id: task.id,
      assignee_id: user.id,
      assigned_by: user.id,
      assignment_type: 'member',
      assignment_status: 'completed',
      estimated_hours: 8,
      actual_hours: 6,
      progress_percentage: 100,
      completed_at: DateTime.now().minus({ hours: 4 }),
    })
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: 'senior',
      total_reviews: 3,
      avg_score: 90,
      avg_percentage: 90,
    })
    await UserWorkHistory.create({
      user_id: user.id,
      task_id: task.id,
      task_assignment_id: assignment.id,
      organization_id: task.organization_id,
      project_id: task.project_id,
      task_title: task.title,
      task_type: task.task_type,
      business_domain: task.business_domain,
      problem_category: task.problem_category,
      role_in_task: task.role_in_task,
      autonomy_level: task.autonomy_level,
      collaboration_type: task.collaboration_type,
      tech_stack: ['ts', 'node'],
      domain_tags: ['platform', 'delivery'],
      difficulty: task.difficulty,
      estimated_hours: 8,
      actual_hours: 6,
      was_on_time: true,
      days_early_or_late: -1,
      measurable_outcomes: [{ metric: 'lead_time', value: 'reduced' }],
      estimated_business_value: 'high',
      knowledge_artifacts: [{ kind: 'doc', title: 'Postmortem' }],
      overall_quality_score: 4.6,
      skill_scores: [{ skill_name: 'TypeScript', assigned_level_code: 'senior' }],
      evidence_links: [{ evidence_id: 'evidence-1' }],
      is_featured: false,
      is_public: false,
      completed_at: DateTime.now().minus({ days: 1 }),
    })
    const previousSnapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      snapshot_name: 'Previous snapshot',
      is_current: true,
      is_public: false,
      shareable_slug: null,
      shareable_token: null,
      summary: { stale: true },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const command = new PublishUserProfileSnapshotCommand(ExecutionContext.system(user.id))
    const result = await command.handle({
      snapshotName: 'Published profile',
    })

    const currentSnapshot = await UserProfileSnapshot.findOrFail(result.snapshotId)
    const archivedPreviousSnapshot = await UserProfileSnapshot.findOrFail(previousSnapshot.id)

    assert.equal(result.version, 2)
    assert.isTrue(result.isPublic)
    assert.isNotNull(result.shareableSlug)
    assert.isNotNull(result.shareableToken)
    assert.equal(currentSnapshot.version, 2)
    assert.isTrue(currentSnapshot.is_current)
    assert.isFalse(archivedPreviousSnapshot.is_current)
    assert.equal(currentSnapshot.snapshot_name, 'Published profile')
    const summary = currentSnapshot.summary
    const performanceMetrics = currentSnapshot.performance_metrics
    const workHighlightsRaw = currentSnapshot.work_highlights
    const trustMetrics = currentSnapshot.trust_metrics

    if (
      summary === null ||
      performanceMetrics === null ||
      workHighlightsRaw === null ||
      trustMetrics === null
    ) {
      throw new Error('Published snapshot is missing derived payload')
    }

    const workHighlights = workHighlightsRaw as Record<string, unknown>[]

    assert.equal(summary.total_verified_skills, 1)
    assert.equal(summary.total_tasks_completed, 1)
    assert.equal(performanceMetrics.total_tasks_completed, 1)
    assert.equal(workHighlights.length, 1)
    assert.equal(workHighlights[0]?.task_title, 'Delivered feature')
    assert.include(trustMetrics.tech_stack as string[], 'ts')
  })

  test('publishes private snapshot with null share fields and invalidates cache after commit', async ({
    assert,
  }) => {
    const user = await UserFactory.create({
      username: 'private-snapshot-user',
      email: 'private-snapshot-user@example.com',
    })
    const task = await TaskFactory.create({
      creator_id: user.id,
      assigned_to: user.id,
      title: 'Private highlight',
      difficulty: 'easy',
      estimated_time: 4,
      actual_time: 4,
      status: 'done',
    })
    await db.from('tasks').where('id', task.id).update({
      updated_at: DateTime.now().toSQL(),
      task_type: 'qa_testing',
      business_domain: 'internal_tooling',
      problem_category: 'automation',
      role_in_task: 'contributor',
      collaboration_type: 'small_team',
      autonomy_level: 'supervised',
    })
    await task.refresh()
    const assignment = await TaskAssignment.create({
      task_id: task.id,
      assignee_id: user.id,
      assigned_by: user.id,
      assignment_type: 'member',
      assignment_status: 'completed',
      estimated_hours: 4,
      actual_hours: 4,
      progress_percentage: 100,
      completed_at: DateTime.now().minus({ hours: 8 }),
    })
    await UserWorkHistory.create({
      user_id: user.id,
      task_id: task.id,
      task_assignment_id: assignment.id,
      organization_id: task.organization_id,
      project_id: task.project_id,
      task_title: task.title,
      task_type: task.task_type,
      business_domain: task.business_domain,
      problem_category: task.problem_category,
      role_in_task: task.role_in_task,
      autonomy_level: task.autonomy_level,
      collaboration_type: task.collaboration_type,
      tech_stack: ['ts'],
      domain_tags: ['ops'],
      difficulty: task.difficulty,
      estimated_hours: 4,
      actual_hours: 4,
      was_on_time: true,
      days_early_or_late: 0,
      measurable_outcomes: [{ metric: 'stability', value: 'improved' }],
      estimated_business_value: 'medium',
      knowledge_artifacts: [{ kind: 'note', title: 'Runbook update' }],
      overall_quality_score: 4.2,
      skill_scores: [{ skill_name: 'TypeScript', assigned_level_code: 'middle' }],
      evidence_links: [{ evidence_id: 'evidence-2' }],
      is_featured: false,
      is_public: false,
      completed_at: DateTime.now().minus({ days: 2 }),
    })
    const previousSnapshot = await UserProfileSnapshot.create({
      user_id: user.id,
      version: 1,
      snapshot_name: 'Private previous snapshot',
      is_current: true,
      is_public: true,
      shareable_slug: 'private-snapshot-user-v1-old',
      shareable_token: 'old-token',
      summary: { stale: true },
      skills_verified: [],
      work_highlights: [],
      performance_metrics: {},
      trust_metrics: {},
      scoring_version: 'v1',
    })

    const originalDeleteByPattern = cacheService.deleteByPattern
    const invalidationPatterns: string[] = []
    const invalidationChecks: Promise<void>[] = []
    let sawCommittedSnapshot = false

    cacheService.deleteByPattern = async (pattern: string): Promise<void> => {
      invalidationPatterns.push(pattern)
      const check = (async () => {
        const latestSnapshot = await UserProfileSnapshot.query()
          .where('user_id', user.id)
          .orderBy('version', 'desc')
          .first()
        sawCommittedSnapshot = latestSnapshot?.version === 2 && latestSnapshot.is_current
      })()
      invalidationChecks.push(check)
      await check
    }

    try {
      const command = new PublishUserProfileSnapshotCommand(ExecutionContext.system(user.id))
      const result = await command.handle({
        snapshotName: 'Private profile',
        isPublic: false,
      })

      await Promise.all(invalidationChecks)

      const currentSnapshot = await UserProfileSnapshot.findOrFail(result.snapshotId)
      const archivedPreviousSnapshot = await UserProfileSnapshot.findOrFail(previousSnapshot.id)

      assert.equal(result.version, 2)
      assert.isFalse(result.isPublic)
      assert.isNull(result.shareableSlug)
      assert.isNull(result.shareableToken)
      assert.isNull(currentSnapshot.shareable_slug)
      assert.isNull(currentSnapshot.shareable_token)
      assert.isFalse(currentSnapshot.is_public)
      assert.isTrue(currentSnapshot.is_current)
      assert.isFalse(archivedPreviousSnapshot.is_current)
      assert.isTrue(sawCommittedSnapshot)
      assert.includeMembers(invalidationPatterns, [
        `*profile:snapshot:current*${user.id}*`,
        `*profile:snapshot:history*${user.id}*`,
      ])
      assert.isFalse(
        invalidationPatterns.includes(`*profile:snapshot:public*private-snapshot-user-v1-old*`)
      )
    } finally {
      cacheService.deleteByPattern = originalDeleteByPattern
    }
  })
})
