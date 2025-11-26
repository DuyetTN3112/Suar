<script lang="ts">
  import { Building2, CalendarClock, Earth, Gauge, Languages, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-svelte'

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
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
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
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
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

  const signalItems = $derived(
    [
      {
        icon: Building2,
        label: t('user.profile_overview.current_organization', {}, 'Current organization'),
        value: user.current_organization?.name ?? t('user.profile_overview.not_selected', {}, 'Not selected'),
      },
      {
        icon: CalendarClock,
        label: t('user.profile_overview.experience_joined', {}, 'Experience / joined'),
        value: t(
          'user.profile_overview.experience_value',
          { years: deliveryMetrics.years_of_experience, date: deliveryMetrics.joined_at_formatted },
          `${deliveryMetrics.years_of_experience} years · since ${deliveryMetrics.joined_at_formatted}`
        ),
      },
      {
        icon: Earth,
        label: t('user.profile_overview.timezone_language', {}, 'Timezone / language'),
        value: `${user.timezone ?? 'N/A'} · ${typeof user.language === 'string' ? user.language : 'vi'}`,
      },
      {
        icon: MapPin,
        label: t('user.profile_overview.priority_region', {}, 'Preferred region'),
        value:
          settings.preferred_locations.length > 0
            ? settings.preferred_locations.join(', ')
            : t('user.profile_overview.not_declared', {}, 'Not declared'),
      },
      {
        icon: Gauge,
        label: t('user.profile_overview.estimate_accuracy', {}, 'Estimate accuracy'),
        value: t(
          'user.profile_overview.estimate_accuracy_value',
          {
            accuracy: formatPercent(deliveryMetrics.delivery.estimate_accuracy_percentage, 1),
            hours: deliveryMetrics.delivery.avg_hours_over_estimate,
          },
          `${formatPercent(deliveryMetrics.delivery.estimate_accuracy_percentage, 1)} · avg deviation ${
            deliveryMetrics.delivery.avg_hours_over_estimate
          } h/task`
        ),
      },
      {
        icon: Languages,
        label: t('user.profile_overview.job_type_available_from', {}, 'Job type / available from'),
        value: [
          settings.preferred_job_types.join(', '),
          settings.available_from
            ? t(
                'user.profile_overview.available_from',
                { date: formatAvailableDate(settings.available_from) ?? '' },
                `from ${formatAvailableDate(settings.available_from) ?? ''}`
              )
            : null,
        ]
          .filter((item): item is string => Boolean(item))
          .join(' · ') || t('user.profile_overview.not_declared', {}, 'Not declared'),
      },
    ].filter((item) => item.value && item.value !== ' · ')
  )
  function formatAvailableDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return new Intl.DateTimeFormat(documentLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date)
    } catch {
      return dateStr
    }
  }
</script>

<section class="relative overflow-hidden rounded-[28px] border border-border bg-card p-5 text-foreground shadow-suar-md">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.09),transparent_22rem)] bg-size-auto"></div>

  <div class="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
    <!-- Left Column: Cockpit info, metadata & key metrics -->
    <div class="space-y-5">
      <div class="flex flex-wrap items-start gap-4">
        <div class="flex h-18 w-18 shrink-0 items-center justify-center rounded-[22px] border border-border bg-card text-2xl font-black tracking-[0.18em] shadow-suar-xs">
          {initials}
        </div>

        <div class="min-w-0 flex-1 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {t('user.profile_overview.profile_cockpit', {}, 'Profile cockpit')}
            </span>
            <span class="rounded-full border border-border bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <ShieldCheck class="mr-1 inline size-3" />{t('user.profile_overview.verified_signal', {}, 'Verified signal')}
            </span>
            {#if settings.is_searchable}
              <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                <Search class="mr-1 inline size-3" />{t('user.profile_overview.searchable', {}, 'Searchable')}
              </span>
            {/if}
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{user.username}</h1>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{headline}</p>
          </div>

          <div class="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span class="rounded-full border border-border bg-card px-3 py-1">
              {profileStatusName}
            </span>
            <span class="rounded-full border border-border bg-card px-3 py-1">
              {t(
                'user.profile_overview.tasks_on_time_count',
                {
                  onTime: deliveryMetrics.delivery.tasks_on_time,
                  total: Math.max(deliveryMetrics.delivery.total_tasks_completed, 1),
                },
                `${deliveryMetrics.delivery.tasks_on_time}/${Math.max(deliveryMetrics.delivery.total_tasks_completed, 1)} tasks on time`
              )}
            </span>
            {#if currentSnapshot}
              <span class="rounded-full border border-border bg-card px-3 py-1">
                Snapshot v{currentSnapshot.version}
              </span>
            {/if}
            {#if credibilityMetrics.disputed_reviews}
              <span class="rounded-full border border-border bg-card px-3 py-1">
                {t('user.profile_overview.disputed', {}, 'Disputed')}: {credibilityMetrics.disputed_reviews}
              </span>
            {/if}
            {#if disputedSkillCount > 0}
              <span class="rounded-full border border-border bg-card px-3 py-1">
                {t('user.profile_overview.disputed_skill_count', { count: disputedSkillCount }, `${disputedSkillCount} disputed skills`)}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Metadata fields grid -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each signalItems as item (item.label)}
          <div class="rounded-2xl border border-border bg-card p-3 shadow-suar-xs">
            <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <item.icon class="size-3.5" />
              {item.label}
            </p>
            <p class="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        {/each}
      </div>

      <!-- Core summary stats grid -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each summaryStats as stat (stat.label)}
          <article class={`rounded-[24px] border p-4 shadow-suar-sm ${stat.tone}`}>
            <p class="text-xs font-semibold text-muted-foreground">{stat.label}</p>
            <p class="mt-3 text-3xl font-black tracking-tight">{stat.value}</p>
            <p class="mt-2 text-xs font-semibold opacity-75">{stat.note}</p>
          </article>
        {/each}
      </div>
    </div>

    <!-- Right Column: Task breakdown, Skills depth & Credibility -->
    <div class="space-y-4">
      <!-- Task breakdown card -->
      <div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_overview.task_breakdown', {}, 'Task breakdown')}</p>
        {#if taskBreakdown.completed > 0}
          {@const total = Math.max(taskBreakdown.completed, 1)}
          {@const onTimePct = (taskBreakdown.onTime / total) * 100}
          {@const latePct = (taskBreakdown.late / total) * 100}
          {@const ongoingPct = (taskBreakdown.ongoing / total) * 100}
          <div class="mt-4 flex h-3.5 overflow-hidden rounded-full bg-secondary/50 p-0.5 shadow-inner">
            {#if onTimePct > 0}
              <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.4)] transition-all duration-1000 ease-out" style="width: {onTimePct}%"></div>
            {/if}
            {#if ongoingPct > 0}
              <div class="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(96,165,250,0.4)] transition-all duration-1000 ease-out" style="width: {ongoingPct}%"></div>
            {/if}
            {#if latePct > 0}
              <div class="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-500 shadow-[0_0_10px_rgba(251,113,133,0.4)] transition-all duration-1000 ease-out" style="width: {latePct}%"></div>
            {/if}
          </div>
          <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground">
            <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>{t('user.profile_overview.on_time', {}, 'On time')}: <span class="text-foreground">{taskBreakdown.onTime}</span></span>
            <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>{t('user.profile_overview.ongoing', {}, 'In progress')}: <span class="text-foreground">{taskBreakdown.ongoing}</span></span>
            <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]"></span>{t('user.profile_overview.late', {}, 'Late')}: <span class="text-foreground">{taskBreakdown.late}</span></span>
          </div>
        {:else}
          <p class="mt-3 text-xs text-muted-foreground">{t('user.profile_overview.no_task_data', {}, 'No task data yet.')}</p>
        {/if}
      </div>

      <!-- Skill depth card -->
      <div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_overview.skill_depth', {}, 'Skill depth')}</p>
        {#if skillDepth.total > 0}
          <div class="mt-4 space-y-3">
            {#if skillDepth.advanced > 0}
              <div class="flex items-center gap-3">
                <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L9-L14</span>
                <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
                  <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.advanced / skillDepth.total) * 100}%"></div>
                </div>
                <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.advanced}</span>
              </div>
            {/if}
            {#if skillDepth.deliveryReady > 0}
              <div class="flex items-center gap-3">
                <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L4-L8</span>
                <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
                  <div class="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.deliveryReady / skillDepth.total) * 100}%"></div>
                </div>
                <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.deliveryReady}</span>
              </div>
            {/if}
            {#if skillDepth.foundation > 0}
              <div class="flex items-center gap-3">
                <span class="w-16 text-[11px] font-bold tracking-wider text-muted-foreground">L0-L3</span>
                <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/60 shadow-inner">
                  <div class="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-1000 ease-out" style="width: {(skillDepth.foundation / skillDepth.total) * 100}%"></div>
                </div>
                <span class="w-4 text-right text-[11px] font-black text-foreground">{skillDepth.foundation}</span>
              </div>
            {/if}
          </div>
          <p class="mt-2 text-[10px] font-semibold text-muted-foreground">{t('user.profile_overview.total_skills', { count: skillDepth.total }, `Total: ${skillDepth.total} skills`)}</p>
        {:else}
          <p class="mt-3 text-xs text-muted-foreground">{t('user.profile_overview.no_skill_data', {}, 'No skills declared yet.')}</p>
        {/if}
      </div>

      <!-- Review credibility card -->
      <article class="rounded-[24px] border border-border bg-card p-4 text-foreground shadow-suar-xs">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_overview.review_credibility', {}, 'Review credibility')}</p>
            <p class="mt-2 text-2xl font-black text-foreground">
              {formatCompactNumber(credibilityMetrics.credibility_score, 1)}
            </p>
          </div>
          <div class="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
            <Sparkles class="mr-1 inline size-3 text-primary" />
            {t('user.profile_overview.review_accuracy', { value: formatPercent(reviewAccuracy, 1) }, `${formatPercent(reviewAccuracy, 1)} review accuracy`)}
          </div>
        </div>

        <div class="mt-4 grid gap-3 grid-cols-3">
          <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.reviews_given', {}, 'Reviews given')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.total_reviews_given, 0)}</p>
          </div>
          <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.accurate', {}, 'Accurate')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.accurate_reviews, 0)}</p>
          </div>
          <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
            <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.disputed', {}, 'Disputed')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.disputed_reviews, 0)}</p>
          </div>
        </div>
      </article>
    </div>
  </div>
</section>
