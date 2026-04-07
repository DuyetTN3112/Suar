import db from '@adonisjs/lucid/services/db'

import type { SeedContext } from './types.js'

export interface SeedProfileRuntime {
  uuid(): string
  isoDaysAgo(daysAgo: number, hour?: number): string
  toJson(value: unknown): string
  readNonEmptyString(value: unknown, fallback: string): string
  toRecord(value: unknown): Record<string, unknown>
  parseJsonRecord(value: string): Record<string, unknown>
}

export async function seedProfileAggregates(
  runtime: SeedProfileRuntime,
  context: SeedContext
): Promise<SeedContext> {
  await resetProfileAggregateScope([context.users.member.id, context.users.owner.id])
  await seedUserWorkHistory(runtime, context)
  await seedUserPerformanceStats(runtime, context)
  await seedUserDomainExpertise(runtime, context)

  await createProfileSnapshot(runtime, context.users.member.id, 'duyetlaaithe draft snapshot', false)
  context.snapshots.member = await createProfileSnapshot(
    runtime,
    context.users.member.id,
    'duyetlaaithe profile proof',
    true
  )
  context.snapshots.owner = await createProfileSnapshot(
    runtime,
    context.users.owner.id,
    'organization-owner profile snapshot',
    true
  )

  return context
}

async function resetProfileAggregateScope(userIds: string[]): Promise<void> {
  for (const table of [
    'user_profile_snapshots',
    'user_work_history',
    'user_domain_expertise',
    'user_performance_stats',
  ]) {
    await db.from(table).whereIn('user_id', userIds).delete()
  }
}

async function seedUserWorkHistory(
  runtime: SeedProfileRuntime,
  context: SeedContext
): Promise<void> {
  const { getTaskSpec } = await import('./task_specs.js')
  const { SEED_USER_WORK_HISTORY_ROWS } = await import('./work_history_specs.js')
  const rows = SEED_USER_WORK_HISTORY_ROWS

  for (const row of rows) {
    const spec = getTaskSpec(row.taskKey)
    const taskEntry = context.tasks[row.taskKey]
    const task = runtime.readNonEmptyString(taskEntry?.id, row.taskKey)
    const assignment = runtime.readNonEmptyString(context.assignments[row.taskKey]?.id, row.taskKey)

    await db
      .insertQuery()
      .table('user_work_history')
      .insert({
        id: runtime.uuid(),
        user_id: context.users[row.user].id,
        task_id: task,
        task_assignment_id: assignment,
        organization_id: taskEntry?.organizationId ?? null,
        project_id: taskEntry?.projectId ?? null,
        task_title: taskEntry?.title ?? row.taskKey,
        task_type: spec.taskType,
        business_domain: spec.businessDomain,
        problem_category: spec.problemCategory,
        role_in_task: spec.roleInTask,
        autonomy_level: spec.autonomyLevel,
        collaboration_type: spec.collaborationType,
        tech_stack: runtime.toJson(spec.techStack),
        domain_tags: runtime.toJson(spec.domainTags),
        difficulty: spec.difficulty,
        estimated_hours: spec.assignmentEstimatedHours ?? null,
        actual_hours: spec.assignmentActualHours ?? null,
        was_on_time: 'wasOnTime' in row ? row.wasOnTime : false,
        days_early_or_late: row.daysEarlyOrLate,
        measurable_outcomes: runtime.toJson(spec.measurableOutcomes),
        estimated_business_value: spec.impactScope,
        knowledge_artifacts: runtime.toJson(row.knowledgeArtifacts),
        overall_quality_score: row.overallQualityScore,
        skill_scores: runtime.toJson(
          row.skillScores.map((skill) => ({
            skill_id: context.skills[skill.skillCode],
            skill_name: skill.skillName,
            reviewer_type: skill.reviewerType,
            assigned_level_code: skill.assignedLevelCode,
            comment: skill.comment,
          }))
        ),
        evidence_links: runtime.toJson(row.evidenceLinks),
        is_featured: 'isFeatured' in row ? row.isFeatured : false,
        is_public: 'isPublic' in row ? row.isPublic : false,
        completed_at: runtime.isoDaysAgo(spec.assignmentCompletedDaysAgo ?? 0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function seedUserPerformanceStats(
  runtime: SeedProfileRuntime,
  context: SeedContext
): Promise<void> {
  const { SEED_USER_PERFORMANCE_STATS_ROWS } = await import('./performance_stats_specs.js')
  const rows = SEED_USER_PERFORMANCE_STATS_ROWS.map((row) => ({
    ...row,
    userId: context.users[row.userKey].id,
  }))

  for (const row of rows) {
    await db
      .insertQuery()
      .table('user_performance_stats')
      .insert({
        id: runtime.uuid(),
        user_id: row.userId,
        period_start: null,
        period_end: null,
        total_tasks_completed: row.totalTasksCompleted,
        total_hours_worked: row.totalHoursWorked,
        avg_quality_score: row.avgQualityScore,
        on_time_delivery_rate: row.onTimeDeliveryRate,
        avg_days_early_or_late: row.avgDaysEarlyOrLate,
        performance_score: row.performanceScore,
        tasks_by_type: runtime.toJson(row.tasksByType),
        tasks_by_difficulty: runtime.toJson(row.tasksByDifficulty),
        tasks_by_domain: runtime.toJson(row.tasksByDomain),
        tasks_as_lead: row.tasksAsLead,
        tasks_as_sole_contributor: row.tasksAsSoleContributor,
        tasks_mentoring_others: row.tasksMentoringOthers,
        longest_on_time_streak: row.longestOnTimeStreak,
        current_on_time_streak: row.currentOnTimeStreak,
        self_assessment_accuracy: row.selfAssessmentAccuracy,
        calculated_at: runtime.isoDaysAgo(0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function seedUserDomainExpertise(
  runtime: SeedProfileRuntime,
  context: SeedContext
): Promise<void> {
  const { SEED_USER_DOMAIN_EXPERTISE_ROWS } = await import('./domain_expertise_specs.js')
  const rows = SEED_USER_DOMAIN_EXPERTISE_ROWS.map((row) => ({
    ...row,
    userId: context.users[row.userKey].id,
  }))

  for (const row of rows) {
    await db
      .insertQuery()
      .table('user_domain_expertise')
      .insert({
        id: runtime.uuid(),
        user_id: row.userId,
        tech_stack_frequency: runtime.toJson(row.techStackFrequency),
        domain_frequency: runtime.toJson(row.domainFrequency),
        problem_category_frequency: runtime.toJson(row.problemCategoryFrequency),
        top_skills: runtime.toJson(row.topSkills),
        calculated_at: runtime.isoDaysAgo(0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function createProfileSnapshot(
  runtime: SeedProfileRuntime,
  userId: string,
  snapshotName: string,
  isPublic: boolean
): Promise<string> {
  const user = (await db.from('users').where('id', userId).first()) as {
    username?: unknown
    trust_data?: unknown
  } | null
  if (!user) {
    throw new Error(`User ${userId} not found for snapshot seed`)
  }

  const lastSnapshot = (await db
    .from('user_profile_snapshots')
    .where('user_id', userId)
    .orderBy('version', 'desc')
    .first()) as { version?: string | number } | null

  const nextVersion = Number(lastSnapshot?.version ?? 0) + 1
  const username = runtime.readNonEmptyString(user.username, userId)
  const slugBase = username.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const versionLabel = String(nextVersion)
  const shareableSlug = isPublic ? `${slugBase}-v${versionLabel}` : null
  const shareableToken = isPublic ? `${slugBase.replace(/-/g, '')}${versionLabel}` : null

  const skills = (await db
    .from('user_skills as us')
    .join('skills as s', 's.id', 'us.skill_id')
    .where('us.user_id', userId)
    .orderBy('us.total_reviews', 'desc')
    .select(
      'us.skill_id',
      's.skill_name',
      'us.level_code',
      'us.total_reviews',
      'us.avg_percentage',
      'us.avg_score',
      'us.last_reviewed_at'
    )) as {
    skill_id: string
    skill_name: string
    level_code: string
    total_reviews: string | number | null
    avg_percentage: string | number | null
    avg_score: string | number | null
    last_reviewed_at: string | null
  }[]

  const performance = (await db
    .from('user_performance_stats')
    .where('user_id', userId)
    .whereNull('period_start')
    .whereNull('period_end')
    .orderBy('calculated_at', 'desc')
    .first()) as {
    total_tasks_completed?: string | number | null
    total_hours_worked?: string | number | null
    avg_quality_score?: string | number | null
    on_time_delivery_rate?: string | number | null
    performance_score?: string | number | null
    tasks_by_type?: Record<string, unknown>
    tasks_by_domain?: Record<string, unknown>
    tasks_by_difficulty?: Record<string, unknown>
  } | null

  const domainExpertise = (await db
    .from('user_domain_expertise')
    .where('user_id', userId)
    .first()) as {
    tech_stack_frequency?: Record<string, unknown>
    domain_frequency?: Record<string, unknown>
    problem_category_frequency?: Record<string, unknown>
    top_skills?: Record<string, unknown>[]
  } | null

  const highlights = (await db
    .from('user_work_history')
    .where('user_id', userId)
    .orderBy('completed_at', 'desc')
    .limit(6)) as Record<string, unknown>[]

  await db
    .from('user_profile_snapshots')
    .where('user_id', userId)
    .where('is_current', true)
    .update({ is_current: false, updated_at: runtime.isoDaysAgo(0) })

  const trustData =
    typeof user.trust_data === 'string'
      ? runtime.parseJsonRecord(user.trust_data)
      : runtime.toRecord(user.trust_data)

  const verifiedSkills = skills
    .filter((skill) => Number(skill.total_reviews ?? 0) > 0)
    .map((skill) => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      level_code: skill.level_code,
      total_reviews: Number(skill.total_reviews ?? 0),
      avg_percentage: Number(skill.avg_percentage ?? 0),
      avg_score: Number(skill.avg_score ?? 0),
      last_reviewed_at: skill.last_reviewed_at,
    }))

  const summary = {
    user_id: userId,
    username,
    total_verified_skills: verifiedSkills.length,
    total_tasks_completed: Number(performance?.total_tasks_completed ?? highlights.length),
    trust_score: Number(trustData.calculated_score ?? 0),
    trust_tier: trustData.current_tier_code ?? null,
    generated_at: new Date().toISOString(),
  }

  const performanceMetrics = {
    total_tasks_completed: Number(performance?.total_tasks_completed ?? 0),
    total_hours_worked: Number(performance?.total_hours_worked ?? 0),
    avg_quality_score:
      performance?.avg_quality_score !== null && performance?.avg_quality_score !== undefined
        ? Number(performance.avg_quality_score)
        : null,
    on_time_delivery_rate:
      performance?.on_time_delivery_rate !== null &&
      performance?.on_time_delivery_rate !== undefined
        ? Number(performance.on_time_delivery_rate)
        : null,
    performance_score:
      performance?.performance_score !== null && performance?.performance_score !== undefined
        ? Number(performance.performance_score)
        : null,
    tasks_by_type: performance?.tasks_by_type ?? {},
    tasks_by_domain: performance?.tasks_by_domain ?? {},
    tasks_by_difficulty: performance?.tasks_by_difficulty ?? {},
  }

  const trustMetrics = {
    trust_data: trustData,
    domain_expertise: {
      tech_stack_frequency: domainExpertise?.tech_stack_frequency ?? {},
      domain_frequency: domainExpertise?.domain_frequency ?? {},
      problem_category_frequency: domainExpertise?.problem_category_frequency ?? {},
      top_skills: domainExpertise?.top_skills ?? [],
    },
  }

  const snapshotId = runtime.uuid()
  await db
    .insertQuery()
    .table('user_profile_snapshots')
    .insert({
      id: snapshotId,
      user_id: userId,
      version: nextVersion,
      snapshot_name: snapshotName,
      is_current: true,
      is_public: isPublic,
      shareable_slug: shareableSlug,
      shareable_token: shareableToken,
      summary: runtime.toJson(summary),
      skills_verified: runtime.toJson(verifiedSkills),
      work_highlights: runtime.toJson(highlights),
      performance_metrics: runtime.toJson(performanceMetrics),
      trust_metrics: runtime.toJson(trustMetrics),
      scoring_version: 'seed-v1',
      created_at: runtime.isoDaysAgo(0),
      updated_at: runtime.isoDaysAgo(0),
    })

  return snapshotId
}
