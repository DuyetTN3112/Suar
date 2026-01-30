import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

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
  context: SeedContext,
  trx: TransactionClientContract
): Promise<SeedContext> {
  await resetProfileAggregateScope(
    trx,
    Object.values(context.users).map((user) => user.id)
  )
  await seedUserWorkHistory(runtime, context, trx)
  await seedUserPerformanceStats(runtime, context, trx)
  await seedUserDomainExpertise(runtime, context, trx)

  await createProfileSnapshot(runtime, trx, context.users.member.id, 'Hồ sơ năng lực nội bộ', false)
  context.snapshots['member'] = await createProfileSnapshot(
    runtime,
    trx,
    context.users.member.id,
    'Hồ sơ năng lực đã xác thực',
    true
  )
  context.snapshots['owner'] = await createProfileSnapshot(
    runtime,
    trx,
    context.users.owner.id,
    'Hồ sơ điều hành sản phẩm và quản trị chất lượng',
    true
  )
  for (const [key, user] of Object.entries(context.users)) {
    if (key === 'member' || key === 'owner') continue
    context.snapshots[key] = await createProfileSnapshot(
      runtime,
      trx,
      user.id,
      `Hồ sơ năng lực xác thực · ${user.username}`,
      false
    )
  }

  return context
}

async function resetProfileAggregateScope(
  trx: TransactionClientContract,
  userIds: string[]
): Promise<void> {
  for (const table of [
    'user_profile_snapshots',
    'user_work_history',
    'user_domain_expertise',
    'user_performance_stats',
  ]) {
    await trx.from(table).whereIn('user_id', userIds).delete()
  }
}

async function seedUserWorkHistory(
  runtime: SeedProfileRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  const { getSeededTaskSpecs } = await import('./task_specs.js')
  const { SEED_USER_WORK_HISTORY_ROWS } = await import('./work_history_specs.js')
  type CuratedWorkHistoryRow = (typeof SEED_USER_WORK_HISTORY_ROWS)[number]
  const curatedRowsByTaskKey = new Map<string, CuratedWorkHistoryRow>(
    SEED_USER_WORK_HISTORY_ROWS.map((row) => [row.taskKey, row])
  )
  const completedSpecs = getSeededTaskSpecs({ dense: true }).filter(
    (spec) =>
      spec.taskStatus === 'done' &&
      spec.assignee !== undefined &&
      context.tasks[spec.key] !== undefined &&
      context.assignments[spec.key] !== undefined
  )

  for (const spec of completedSpecs) {
    const curated = curatedRowsByTaskKey.get(spec.key)
    const userKey = curated?.user ?? spec.assignee
    if (!userKey) {
      throw new Error(`Completed task ${spec.key} has no work-history owner`)
    }

    const taskEntry = context.tasks[spec.key]
    const task = runtime.readNonEmptyString(taskEntry?.id, spec.key)
    const assignment = runtime.readNonEmptyString(context.assignments[spec.key]?.id, spec.key)
    const daysEarlyOrLate =
      curated?.daysEarlyOrLate ??
      (spec.assignmentCompletedDaysAgo ?? 0) + spec.dueDaysOffset
    const wasOnTime =
      curated && 'wasOnTime' in curated ? curated.wasOnTime : daysEarlyOrLate >= 0

    await trx
      .insertQuery()
      .table('user_work_history')
      .insert({
        id: runtime.uuid(),
        user_id: context.users[userKey].id,
        task_id: task,
        task_assignment_id: assignment,
        organization_id: taskEntry?.organizationId ?? null,
        project_id: taskEntry?.projectId ?? null,
        task_title: taskEntry?.title ?? spec.key,
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
        was_on_time: wasOnTime,
        days_early_or_late: daysEarlyOrLate,
        measurable_outcomes: runtime.toJson(spec.measurableOutcomes),
        estimated_business_value: spec.impactScope,
        knowledge_artifacts: runtime.toJson(curated?.knowledgeArtifacts ?? []),
        overall_quality_score: curated?.overallQualityScore ?? null,
        skill_scores: runtime.toJson(
          (curated?.skillScores ?? []).map((skill) => ({
            skill_id: context.skills[skill.skillCode],
            skill_name: skill.skillName,
            reviewer_type: skill.reviewerType,
            assigned_public_proficiency_code: skill.assignedLevelCode,
            comment: skill.comment,
          }))
        ),
        evidence_links: runtime.toJson(curated?.evidenceLinks ?? []),
        is_featured: curated && 'isFeatured' in curated ? curated.isFeatured : false,
        is_public: curated && 'isPublic' in curated ? curated.isPublic : false,
        completed_at: runtime.isoDaysAgo(spec.assignmentCompletedDaysAgo ?? 0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function seedUserPerformanceStats(
  runtime: SeedProfileRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  const { SEED_USER_PERFORMANCE_STATS_ROWS } = await import('./performance_stats_specs.js')
  const { SEED_USERS_SPECS } = await import('./user_seeds_specs.js')
  const rows = SEED_USER_PERFORMANCE_STATS_ROWS.map((row) => ({
    ...row,
    userId: context.users[row.userKey].id,
  }))

  for (const row of rows) {
    await trx
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

  const explicitUsers = new Set(SEED_USER_PERFORMANCE_STATS_ROWS.map((row) => row.userKey))
  for (const [userKey, user] of Object.entries(context.users)) {
    if (explicitUsers.has(userKey as (typeof SEED_USER_PERFORMANCE_STATS_ROWS)[number]['userKey'])) {
      continue
    }

    const history = (await trx
      .from('user_work_history')
      .where('user_id', user.id)
      .select(
        'task_type',
        'business_domain',
        'difficulty',
        'actual_hours',
        'overall_quality_score',
        'was_on_time',
        'days_early_or_late'
      )) as {
      task_type: string | null
      business_domain: string | null
      difficulty: string | null
      actual_hours: string | number | null
      overall_quality_score: string | number | null
      was_on_time: boolean | null
      days_early_or_late: string | number | null
    }[]
    const countBy = (values: (string | null)[]): Record<string, number> =>
      values.reduce<Record<string, number>>((counts, value) => {
        if (value) counts[value] = (counts[value] ?? 0) + 1
        return counts
      }, {})
    const qualityScores = history
      .map((row) => row.overall_quality_score)
      .filter((value): value is string | number => value !== null)
      .map(Number)
    const timingValues = history
      .map((row) => row.days_early_or_late)
      .filter((value): value is string | number => value !== null)
      .map(Number)
    const onTimeCount = history.filter((row) => row.was_on_time === true).length
    const completionRate = history.length > 0 ? onTimeCount / history.length : 0
    const careerBaseline = SEED_USERS_SPECS[userKey as keyof typeof SEED_USERS_SPECS].completedTasks

    await trx
      .insertQuery()
      .table('user_performance_stats')
      .insert({
        id: runtime.uuid(),
        user_id: user.id,
        period_start: null,
        period_end: null,
        total_tasks_completed: history.length,
        total_hours_worked: history.reduce(
          (total, row) => total + Number(row.actual_hours ?? 0),
          0
        ),
        avg_quality_score:
          qualityScores.length > 0
            ? qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length
            : null,
        on_time_delivery_rate: Math.round(completionRate * 10_000) / 100,
        avg_days_early_or_late:
          timingValues.length > 0
            ? timingValues.reduce((total, value) => total + value, 0) / timingValues.length
            : null,
        performance_score:
          history.length > 0
            ? Math.min(96, Math.round((72 + history.length * 2 + completionRate * 12) * 10) / 10)
            : null,
        tasks_by_type: runtime.toJson(countBy(history.map((row) => row.task_type))),
        tasks_by_difficulty: runtime.toJson(countBy(history.map((row) => row.difficulty))),
        tasks_by_domain: runtime.toJson(countBy(history.map((row) => row.business_domain))),
        tasks_as_lead: 0,
        tasks_as_sole_contributor: 0,
        tasks_mentoring_others: 0,
        longest_on_time_streak: onTimeCount,
        current_on_time_streak: onTimeCount,
        self_assessment_accuracy: Math.min(94, 78 + careerBaseline * 0.5),
        calculated_at: runtime.isoDaysAgo(0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function seedUserDomainExpertise(
  runtime: SeedProfileRuntime,
  context: SeedContext,
  trx: TransactionClientContract
): Promise<void> {
  const { SEED_USER_DOMAIN_EXPERTISE_ROWS } = await import('./domain_expertise_specs.js')
  const { SEED_USERS_SPECS } = await import('./user_seeds_specs.js')
  const rows = SEED_USER_DOMAIN_EXPERTISE_ROWS.map((row) => ({
    ...row,
    userId: context.users[row.userKey].id,
  }))

  for (const row of rows) {
    await trx
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

  const explicitUsers = new Set(SEED_USER_DOMAIN_EXPERTISE_ROWS.map((row) => row.userKey))
  for (const [userKey, user] of Object.entries(context.users)) {
    if (explicitUsers.has(userKey as (typeof SEED_USER_DOMAIN_EXPERTISE_ROWS)[number]['userKey'])) {
      continue
    }

    const history = (await trx
      .from('user_work_history')
      .where('user_id', user.id)
      .select('business_domain', 'problem_category')) as {
      business_domain: string | null
      problem_category: string | null
    }[]
    const countBy = (values: (string | null)[]): Record<string, number> =>
      values.reduce<Record<string, number>>((counts, value) => {
        if (value) counts[value] = (counts[value] ?? 0) + 1
        return counts
      }, {})
    const spec = SEED_USERS_SPECS[userKey as keyof typeof SEED_USERS_SPECS]
    const techStackFrequency = Object.fromEntries(
      spec.skillProfile.map((skill, index) => [skill, Math.max(1, spec.skillProfile.length - index)])
    )
    const topSkills = spec.skillProfile.slice(0, 5).map((skill, index) => ({
      skill_name: skill
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      weighted_score: Math.max(0.68, 0.88 - index * 0.04),
      review_mentions: 0,
      source: 'imported_profile',
    }))

    await trx
      .insertQuery()
      .table('user_domain_expertise')
      .insert({
        id: runtime.uuid(),
        user_id: user.id,
        tech_stack_frequency: runtime.toJson(techStackFrequency),
        domain_frequency: runtime.toJson(countBy(history.map((row) => row.business_domain))),
        problem_category_frequency: runtime.toJson(
          countBy(history.map((row) => row.problem_category))
        ),
        top_skills: runtime.toJson(topSkills),
        calculated_at: runtime.isoDaysAgo(0),
        created_at: runtime.isoDaysAgo(0),
        updated_at: runtime.isoDaysAgo(0),
      })
  }
}

async function createProfileSnapshot(
  runtime: SeedProfileRuntime,
  trx: TransactionClientContract,
  userId: string,
  snapshotName: string,
  isPublic: boolean
): Promise<string> {
  const user = (await trx.from('users').where('id', userId).first()) as {
    username?: unknown
    trust_data?: unknown
  } | null
  if (!user) {
    throw new Error(`User ${userId} not found for snapshot seed`)
  }

  const lastSnapshot = (await trx
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

  const skills = (await trx
    .from('user_skills as us')
    .join('skills as s', 's.id', 'us.skill_id')
    .where('us.user_id', userId)
    .orderBy('us.total_reviews', 'desc')
    .select(
      'us.skill_id',
      's.skill_name',
      'us.verified_public_proficiency_code',
      'us.total_reviews',
      'us.avg_percentage',
      'us.avg_score',
      'us.last_reviewed_at'
    )) as {
    skill_id: string
    skill_name: string
    verified_public_proficiency_code: string
    total_reviews: string | number | null
    avg_percentage: string | number | null
    avg_score: string | number | null
    last_reviewed_at: string | null
  }[]

  const performance = (await trx
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

  const domainExpertise = (await trx
    .from('user_domain_expertise')
    .where('user_id', userId)
    .first()) as {
    tech_stack_frequency?: Record<string, unknown>
    domain_frequency?: Record<string, unknown>
    problem_category_frequency?: Record<string, unknown>
    top_skills?: Record<string, unknown>[]
  } | null

  const highlights = (await trx
    .from('user_work_history')
    .where('user_id', userId)
    .orderBy('completed_at', 'desc')
    .limit(6)) as Record<string, unknown>[]

  await trx
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
      verified_public_proficiency_code: skill.verified_public_proficiency_code,
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
    trust_score: Number(trustData['calculated_score'] ?? 0),
    trust_tier: trustData['current_tier_code'] ?? null,
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
  await trx
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
      scoring_version: 'profile_proof_v1',
      created_at: runtime.isoDaysAgo(0),
      updated_at: runtime.isoDaysAgo(0),
    })

  return snapshotId
}
