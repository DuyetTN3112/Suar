<script lang="ts">
  import { Search } from 'lucide-svelte'

  import { buildProfileChartCardSummary } from '../profile_chart_summary'
  import {
    formatCompactNumber,
    formatPercent,
    getUserInitials,
    normalizeProfileSkillRelation,
    readCredibilityMetrics,
    readProfileSettings,
    readSnapshotInsights,
    readTrustMetrics,
  } from '../profile_view_helpers'
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type {
    ProfileSnapshotSummary,
    SerializedUserProfile,
    SpiderChartPoint,
    UserSkillResult,
  } from '../types.svelte'

  interface DeliveryMetrics {
    delivery: {
      total_tasks_completed: number
      tasks_on_time: number
      tasks_late: number
      late_percentage: number
      estimate_accuracy_percentage: number
      avg_hours_over_estimate: number
    }
    skill_aggregation: {
      total_skills: number
      reviewed_skills: number
      avg_percentage: number | null
    }
    years_of_experience: number
    joined_at_formatted: string
  }

  interface Props {
    user: SerializedUserProfile & Record<string, unknown>
    userSkills?: UserSkillResult[]
    deliveryMetrics: DeliveryMetrics
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const { user, userSkills = [], deliveryMetrics, currentSnapshot = null }: Props = $props()
  const { t } = useTranslation()

  const settings = $derived(readProfileSettings(user as Record<string, unknown>))
  const trustMetrics = $derived(readTrustMetrics(user as Record<string, unknown>))
  const credibilityMetrics = $derived(readCredibilityMetrics(user as Record<string, unknown>))
  const snapshotInsights = $derived(readSnapshotInsights(currentSnapshot))
  const initials = $derived(getUserInitials(user.username))
  const profileStatusName = $derived(user.status_name ?? t('user.profile_overview.member', {}, 'Member'))

  const headline = $derived(
    settings.custom_headline ??
      user.bio ??
      t(
        'user.profile_overview.headline_fallback',
        { status: profileStatusName },
        `${profileStatusName} · Capability profile synthesized from reviews and task assignment history`
      )
  )

  const trustScore = $derived(
    trustMetrics.calculated_score ??
      snapshotInsights.trust_score ??
      (typeof user.trust_score === 'number' ? user.trust_score : null)
  )
  const qualityScore = $derived(
    snapshotInsights.avg_quality_score ??
      (typeof user.external_contributor_rating === 'number' ? user.external_contributor_rating * 20 : null)
  )
  const reverseReviewSummary = $derived(
    typeof user.reverse_review_summary === 'object' && user.reverse_review_summary !== null
      ? (user.reverse_review_summary as {
          total_reviews?: number
          average_rating?: number | null
          peer_reviews?: number
          manager_reviews?: number
        })
      : null
  )
  const normalizedUserSkills = $derived(userSkills.map((skill) => normalizeProfileSkillRelation(skill)))
  const liveTotalSkillCount = $derived(normalizedUserSkills.length)
  const liveReviewedSkillCount = $derived(
    normalizedUserSkills.filter((skill) => skill.total_reviews > 0).length
  )
  const capabilitySummaryPoints = $derived.by(
    () =>
      normalizedUserSkills.map(
        (skill): SpiderChartPoint => ({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name,
          skill_code: skill.skill_id,
          category_code: skill.category_code,
          avg_percentage: skill.avg_percentage ?? 0,
          verified_public_proficiency_code: skill.verified_public_proficiency_code,
          total_reviews: skill.total_reviews,
          source: skill.source === 'reviewed' ? 'reviewed' : skill.source === 'imported' ? 'imported' : null,
          governance_state: skill.governance_state,
        })
      )
  )
  const importedSkillCount = $derived(
    normalizedUserSkills.filter((skill) => skill.total_reviews === 0).length
  )
  const disputedSkillCount = $derived(
    normalizedUserSkills.filter((skill) => skill.governance_state === 'under_dispute').length
  )
  const totalSkillCount = $derived(
    liveTotalSkillCount > 0 ? liveTotalSkillCount : deliveryMetrics.skill_aggregation.total_skills
  )
  const reviewedSkillCount = $derived(
    liveTotalSkillCount > 0
      ? liveReviewedSkillCount
      : snapshotInsights.total_verified_skills ?? deliveryMetrics.skill_aggregation.reviewed_skills
  )
  const evidenceCoverage = $derived.by(() => {
    const totalSkills = totalSkillCount
    if (!totalSkills) return null
    return (reviewedSkillCount / totalSkills) * 100
  })
  const capabilitySummary = $derived.by(() =>
    buildProfileChartCardSummary({
      points: capabilitySummaryPoints,
      totalSkills: totalSkillCount,
      verifiedSkills: reviewedSkillCount,
      importedSkills: importedSkillCount,
      disputedSkills: disputedSkillCount,
    })
  )
  const capabilityVerifiedScore = $derived(
    capabilitySummary.verified_average_score ?? deliveryMetrics.skill_aggregation.avg_percentage
  )
  const completedTasks = $derived(
    snapshotInsights.total_tasks_completed ?? deliveryMetrics.delivery.total_tasks_completed
  )
  const reviewAccuracy = $derived.by(() => {
    const total = credibilityMetrics.total_reviews_given
    const accurate = credibilityMetrics.accurate_reviews
    if (!total || !accurate) {
      return null
    }

    return (accurate / total) * 100
  })

  const taskBreakdown = $derived({
    completed: deliveryMetrics.delivery.total_tasks_completed,
    onTime: deliveryMetrics.delivery.tasks_on_time,
    late: deliveryMetrics.delivery.tasks_late,
    ongoing: Math.max(0, deliveryMetrics.delivery.total_tasks_completed - deliveryMetrics.delivery.tasks_on_time - deliveryMetrics.delivery.tasks_late)
  })

  const skillDepth = $derived.by(() => {
    let advanced = 0
    let deliveryReady = 0
    let foundation = 0
    for (const skill of normalizedUserSkills) {
      const code = skill.verified_public_proficiency_code
      if (!code) continue
      const option = findFrontendCanonicalProficiencyLevelOption(code)
      const order = option?.order ?? 0
      if (order >= 10) advanced++
      else if (order >= 5) deliveryReady++
      else foundation++
    }
    return { advanced, deliveryReady, foundation, total: normalizedUserSkills.length }
  })

  const summaryStats = $derived.by(() => {
    const items = [
      {
        label: t('user.profile_overview.capability_verified', {}, 'Capability verified'),
        value: formatPercent(capabilityVerifiedScore, 1),
        note: t(
          'user.profile_overview.capability_verified_note',
          { count: formatCompactNumber(reviewedSkillCount, 0) },
          `${formatCompactNumber(reviewedSkillCount, 0)} reviewed skills anchoring capability`
        ),
        tone: 'border-border bg-card text-foreground',
      },
      {
        label: t('user.profile_overview.profile_trust', {}, 'Profile trust'),
        value: formatCompactNumber(trustScore, 1),
        note: t(
          'user.profile_overview.profile_trust_note',
          {
            tier: trustMetrics.current_tier_code ?? snapshotInsights.trust_tier ?? 'community',
            count: formatCompactNumber(trustMetrics.total_verified_reviews, 0),
          },
          `${trustMetrics.current_tier_code ?? snapshotInsights.trust_tier ?? 'community'} · ${formatCompactNumber(trustMetrics.total_verified_reviews, 0)} verified reviews`
        ),
        tone: 'border-border bg-accent text-foreground',
      },
      {
        label: t('user.profile_overview.delivery_reliability', {}, 'Delivery reliability'),
        value: formatPercent(snapshotInsights.on_time_delivery_rate ?? (100 - deliveryMetrics.delivery.late_percentage), 1),
        note:
          typeof qualityScore === 'number'
            ? t(
                'user.profile_overview.tasks_quality_note',
                {
                  count: formatCompactNumber(completedTasks, 0),
                  quality: formatPercent(qualityScore, 1),
                },
                `${formatCompactNumber(completedTasks, 0)} tasks shipped · ${formatPercent(qualityScore, 1)} quality`
              )
            : t(
                'user.profile_overview.tasks_shipped',
                { count: formatCompactNumber(completedTasks, 0) },
                `${formatCompactNumber(completedTasks, 0)} tasks shipped`
              ),
        tone: 'border-border bg-card text-foreground',
      },
      {
        label: t('user.profile_overview.evidence_coverage', {}, 'Evidence coverage'),
        value: t(
          'user.profile_overview.verified_value',
          { reviewed: formatCompactNumber(reviewedSkillCount, 0), total: totalSkillCount },
          `${formatCompactNumber(reviewedSkillCount, 0)}/${totalSkillCount} verified`
        ),
        note: t(
          'user.profile_overview.evidence_coverage_note',
          {
            coverage: formatPercent(evidenceCoverage, 1),
            count: importedSkillCount,
            claimLabel: t(
              importedSkillCount === 1
                ? 'user.profile_overview.imported_claim'
                : 'user.profile_overview.imported_claims',
              {},
              importedSkillCount === 1 ? 'imported claim' : 'imported claims'
            ),
          },
          `${formatPercent(evidenceCoverage, 1)} coverage · ${importedSkillCount} ${
            importedSkillCount === 1 ? 'imported claim' : 'imported claims'
          }`
        ),
        tone: 'border-border bg-card text-foreground',
      },
    ]

    if ((reverseReviewSummary?.total_reviews ?? 0) > 0) {
      items.push({
        label: t('user.profile_overview.reverse_feedback', {}, 'Reverse feedback'),
        value:
          typeof reverseReviewSummary?.average_rating === 'number'
            ? `${reverseReviewSummary.average_rating.toFixed(1)}/5`
            : 'N/A',
        note: t(
          'user.profile_overview.reverse_feedback_note',
          {
            count: formatCompactNumber(reverseReviewSummary?.total_reviews ?? 0, 0),
            manager: reverseReviewSummary?.manager_reviews ?? 0,
            peer: reverseReviewSummary?.peer_reviews ?? 0,
          },
          `${formatCompactNumber(reverseReviewSummary?.total_reviews ?? 0, 0)} feedback · ${
            reverseReviewSummary?.manager_reviews ?? 0
          } manager · ${reverseReviewSummary?.peer_reviews ?? 0} peer`
        ),
        tone: 'border-border bg-card text-foreground',
      })
    }

    return items
  })
  const lateTaskSuffix = $derived(
    taskBreakdown.late > 0
      ? t('user.profile_overview.late_suffix', { count: taskBreakdown.late }, ` · ${taskBreakdown.late} late`)
      : ''
  )

</script>

<section class="rounded-xl border border-border bg-card p-5 text-foreground shadow-sm">
  <div class="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-5">
    <div class="flex min-w-0 items-start gap-4">
      <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-2xl font-black tracking-[0.16em]">
        {initials}
      </div>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_overview.profile_label', {}, 'Profile')}</span>
          {#if settings.is_searchable}
            <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <Search class="mr-1 inline size-3" />{t('user.profile_overview.searchable', {}, 'Searchable')}
            </span>
          {/if}
        </div>
        <h1 class="mt-2 break-all text-2xl font-black tracking-tight text-foreground sm:text-3xl">{user.username}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm leading-6 text-muted-foreground">
          <span>{profileStatusName}</span>
          <span aria-hidden="true">·</span>
          <span class="min-w-0 break-words">{headline}</span>
        </div>
      </div>
    </div>

    <div class="grid w-full min-w-0 grid-cols-3 gap-2 sm:w-auto sm:min-w-[18rem]">
      <div class="rounded-lg border border-border bg-secondary/20 px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('user.profile_overview.tasks', {}, 'Tasks')}</p>
        <p class="mt-1 text-xl font-black">{formatCompactNumber(completedTasks, 0)}</p>
      </div>
      <div class="rounded-lg border border-border bg-secondary/20 px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('user.profile_overview.skills', {}, 'Skills')}</p>
        <p class="mt-1 text-xl font-black">{totalSkillCount}</p>
      </div>
      <div class="rounded-lg border border-border bg-secondary/20 px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t('user.profile_overview.reviews', {}, 'Reviews')}</p>
        <p class="mt-1 text-xl font-black">{formatCompactNumber(credibilityMetrics.total_reviews_given, 0)}</p>
      </div>
    </div>
  </div>

  <div class="mt-5 grid gap-3 md:grid-cols-4">
    {#each summaryStats.slice(0, 4) as stat (stat.label)}
      <article class="rounded-lg border border-border bg-background px-4 py-3">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
        <p class="mt-2 text-2xl font-black tracking-tight">{stat.value}</p>
        <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{stat.note}</p>
      </article>
    {/each}
  </div>

  <div class="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
    <div class="rounded-lg border border-border bg-background p-4">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('user.profile_overview.delivery', {}, 'Delivery')}</p>
      <div class="mt-3 flex items-end justify-between gap-3">
        <p class="text-3xl font-black">{formatPercent(snapshotInsights.on_time_delivery_rate ?? (100 - deliveryMetrics.delivery.late_percentage), 1)}</p>
        <p class="text-xs font-semibold text-muted-foreground">
          {t(
            'user.profile_overview.tasks_on_time_count',
            { onTime: taskBreakdown.onTime, total: taskBreakdown.completed },
            `${taskBreakdown.onTime}/${taskBreakdown.completed} tasks on time`
          )}{lateTaskSuffix}
        </p>
      </div>
      {#if taskBreakdown.completed === 0}
        <p class="mt-3 text-xs font-semibold text-muted-foreground">{t('user.profile_overview.no_task_data', {}, 'No task data yet.')}</p>
      {/if}
    </div>

    <div class="rounded-lg border border-border bg-background p-4">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('user.profile_overview.skill_depth', {}, 'Skill depth')}</p>
      <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span class="rounded-full border border-border px-3 py-1"><span>L9-L14</span>: {skillDepth.advanced}</span>
        <span class="rounded-full border border-border px-3 py-1"><span>L4-L8</span>: {skillDepth.deliveryReady}</span>
        <span class="rounded-full border border-border px-3 py-1"><span>L0-L3</span>: {skillDepth.foundation}</span>
      </div>
      {#if totalSkillCount === 0}
        <p class="mt-3 text-xs font-semibold text-muted-foreground">{t('user.profile_overview.no_skill_data', {}, 'No skills declared yet.')}</p>
      {:else if disputedSkillCount > 0}
        <p class="mt-3 text-xs font-semibold text-muted-foreground">{t('user.profile_overview.disputed_skill_count', { count: disputedSkillCount }, `${disputedSkillCount} disputed skills`)}</p>
      {/if}
    </div>

    <div class="rounded-lg border border-border bg-background p-4">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('user.profile_overview.review_credibility', {}, 'Review credibility')}</p>
      <div class="mt-3 flex items-end justify-between gap-3">
        <p class="text-3xl font-black">{formatCompactNumber(credibilityMetrics.credibility_score, 1)}</p>
        <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.review_accuracy', { value: formatPercent(reviewAccuracy, 1) }, `${formatPercent(reviewAccuracy, 1)} accuracy`)}</p>
      </div>
    </div>
  </div>
</section>
