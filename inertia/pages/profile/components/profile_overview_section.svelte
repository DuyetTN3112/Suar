<script lang="ts">
  import { Building2, CalendarClock, Earth, Gauge, Languages, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-svelte'

  import {
    formatCompactNumber,
    formatPercent,
    getUserInitials,
    readCredibilityMetrics,
    readProfileSettings,
    readSnapshotInsights,
    readTrustMetrics,
  } from '../profile_view_helpers'
  import type { ProfileSnapshotSummary, SerializedUserProfile } from '../types.svelte'

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
    deliveryMetrics: DeliveryMetrics
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const { user, deliveryMetrics, currentSnapshot = null }: Props = $props()

  const settings = $derived(readProfileSettings(user as Record<string, unknown>))
  const trustMetrics = $derived(readTrustMetrics(user as Record<string, unknown>))
  const credibilityMetrics = $derived(readCredibilityMetrics(user as Record<string, unknown>))
  const snapshotInsights = $derived(readSnapshotInsights(currentSnapshot))
  const initials = $derived(getUserInitials(user.username))

  const headline = $derived(
    settings.custom_headline ??
      user.bio ??
      `${user.status_name ?? 'Thành viên'} · Hồ sơ năng lực tổng hợp từ review và lịch sử giao việc`
  )

  const trustScore = $derived(
    trustMetrics.calculated_score ??
      snapshotInsights.trust_score ??
      (typeof user.trust_score === 'number' ? user.trust_score : null)
  )
  const performanceScore = $derived(
    snapshotInsights.performance_score ??
      trustMetrics.performance_score ??
      deliveryMetrics.skill_aggregation.avg_percentage
  )
  const qualityScore = $derived(
    snapshotInsights.avg_quality_score ??
      (typeof user.freelancer_rating === 'number' ? user.freelancer_rating * 20 : null)
  )
  const reviewedSkillCount = $derived(
    snapshotInsights.total_verified_skills ?? deliveryMetrics.skill_aggregation.reviewed_skills
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

  const skillsList = $derived(Array.isArray(user.skills) ? (user.skills as unknown as Record<string, unknown>[]) : [])
  const skillDepth = $derived.by(() => {
    let senior = 0
    let mid = 0
    let beginner = 0
    for (const s of skillsList) {
      const code = s.level_code as string | undefined
      if (!code) continue
      const c = code.toLowerCase()
      if (c.includes("sen") || c.includes("lead")) senior++
      else if (c.includes("mid") || c.includes("jun")) mid++
      else beginner++
    }
    return { senior, mid, beginner, total: skillsList.length }
  })

  const summaryStats = $derived([
    {
      label: 'Trust score',
      value: formatCompactNumber(trustScore, 1),
      note: trustMetrics.current_tier_code ?? snapshotInsights.trust_tier ?? 'community',
      tone: 'border-border bg-white text-foreground',
    },
    {
      label: 'Performance',
      value: formatPercent(performanceScore, 1),
      note:
        typeof qualityScore === 'number'
          ? `${formatPercent(qualityScore, 1)} quality`
          : 'Chưa có quality signal',
      tone: 'border-black bg-accent text-foreground',
    },
    {
      label: 'Skills verified',
      value: formatCompactNumber(reviewedSkillCount, 0),
      note: `${deliveryMetrics.skill_aggregation.total_skills} total skills`,
      tone: 'border-border bg-[color-mix(in_srgb,var(--color-black)_2%,white)] text-foreground',
    },
    {
      label: 'Tasks shipped',
      value: formatCompactNumber(completedTasks, 0),
      note: `${formatPercent(snapshotInsights.on_time_delivery_rate ?? (100 - deliveryMetrics.delivery.late_percentage), 1)} on-time`,
      tone: 'border-border bg-white text-foreground',
    },
  ])

  const signalItems = $derived(
    [
      {
        icon: Building2,
        label: 'Tổ chức hiện tại',
        value: user.current_organization?.name ?? 'Chưa chọn',
      },
      {
        icon: CalendarClock,
        label: 'Kinh nghiệm / tham gia',
        value: `${deliveryMetrics.years_of_experience} năm · từ ${deliveryMetrics.joined_at_formatted}`,
      },
      {
        icon: Earth,
        label: 'Múi giờ / ngôn ngữ',
        value: `${user.timezone ?? 'N/A'} · ${typeof user.language === 'string' ? user.language : 'vi'}`,
      },
      {
        icon: MapPin,
        label: 'Khu vực ưu tiên',
        value:
          settings.preferred_locations.length > 0
            ? settings.preferred_locations.join(', ')
            : 'Chưa khai báo',
      },
      {
        icon: Gauge,
        label: 'Độ chính xác ước lượng',
        value: `${formatPercent(deliveryMetrics.delivery.estimate_accuracy_percentage, 1)} · lệch tb ${deliveryMetrics.delivery.avg_hours_over_estimate} giờ/task`,
      },
      {
        icon: Languages,
        label: 'Loại công việc / available from',
        value: [
          settings.preferred_job_types.join(', '),
          settings.available_from ? `từ ${formatAvailableDate(settings.available_from) ?? ''}` : null,
        ]
          .filter((item): item is string => Boolean(item))
          .join(' · ') || 'Chưa khai báo',
      },
    ].filter((item) => item.value && item.value !== ' · ')
  )

  function formatAvailableDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }
</script>

<section class="relative overflow-hidden rounded-[28px] border border-border bg-white p-5 text-foreground shadow-suar-md">
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,26,0.09),transparent_22rem),linear-gradient(rgba(17,17,17,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.03)_1px,transparent_1px)] bg-size-[auto,48px_48px,48px_48px]"></div>

  <div class="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
    <!-- Left Column: Cockpit info, metadata & key metrics -->
    <div class="space-y-5">
      <div class="flex flex-wrap items-start gap-4">
        <div class="flex h-18 w-18 shrink-0 items-center justify-center rounded-[22px] border-2 border-black bg-white text-2xl font-black tracking-[0.18em] shadow-suar-accent">
          {initials}
        </div>

        <div class="min-w-0 flex-1 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Profile cockpit
            </span>
            <span class="rounded-full border border-black bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              <ShieldCheck class="mr-1 inline size-3" />verified signal
            </span>
            {#if settings.is_searchable}
              <span class="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                <Search class="mr-1 inline size-3" />searchable
              </span>
            {/if}
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{user.username}</h1>
            <p class="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{headline}</p>
          </div>

          <div class="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
            <span class="rounded-full border border-border bg-white px-3 py-1">
              {user.status_name ?? 'Thành viên'}
            </span>
            <span class="rounded-full border border-border bg-white px-3 py-1">
              {deliveryMetrics.delivery.tasks_on_time}/{Math.max(deliveryMetrics.delivery.total_tasks_completed, 1)} nhiệm vụ đúng hạn
            </span>
            {#if currentSnapshot}
              <span class="rounded-full border border-border bg-white px-3 py-1">
                Snapshot v{currentSnapshot.version}
              </span>
            {/if}
            {#if credibilityMetrics.disputed_reviews}
              <span class="rounded-full border border-border bg-white px-3 py-1">
                {credibilityMetrics.disputed_reviews} dispute liên quan review
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Metadata fields grid -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each signalItems as item (item.label)}
          <div class="rounded-2xl border border-border bg-white p-3 shadow-suar-xs">
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
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">{stat.label}</p>
            <p class="mt-3 text-3xl font-black tracking-tight">{stat.value}</p>
            <p class="mt-2 text-xs font-semibold opacity-75">{stat.note}</p>
          </article>
        {/each}
      </div>
    </div>

    <!-- Right Column: Task breakdown, Skills depth & Credibility -->
    <div class="space-y-4">
      <!-- Task breakdown card -->
      <div class="rounded-2xl border border-border bg-white p-4 shadow-suar-xs">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Phân loại nhiệm vụ</p>
        {#if taskBreakdown.completed > 0}
          {@const total = Math.max(taskBreakdown.completed, 1)}
          {@const onTimePct = (taskBreakdown.onTime / total) * 100}
          {@const latePct = (taskBreakdown.late / total) * 100}
          {@const ongoingPct = (taskBreakdown.ongoing / total) * 100}
          <div class="mt-3 flex h-3 overflow-hidden rounded-full border border-border">
            {#if onTimePct > 0}
              <div class="bg-green-500" style="width: {onTimePct}%"></div>
            {/if}
            {#if ongoingPct > 0}
              <div class="bg-yellow-400" style="width: {ongoingPct}%"></div>
            {/if}
            {#if latePct > 0}
              <div class="bg-red-400" style="width: {latePct}%"></div>
            {/if}
          </div>
          <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-muted-foreground">
            <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-green-500"></span>Đúng hạn: {taskBreakdown.onTime}</span>
            <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>Đang làm: {taskBreakdown.ongoing}</span>
            <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-red-400"></span>Trễ: {taskBreakdown.late}</span>
          </div>
        {:else}
          <p class="mt-3 text-xs text-muted-foreground">Chưa có dữ liệu nhiệm vụ.</p>
        {/if}
      </div>

      <!-- Skill depth card -->
      <div class="rounded-2xl border border-border bg-white p-4 shadow-suar-xs">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Độ sâu kỹ năng</p>
        {#if skillDepth.total > 0}
          <div class="mt-3 space-y-2">
            {#if skillDepth.senior > 0}
              <div class="flex items-center gap-2">
                <span class="w-12 text-[10px] font-bold text-muted-foreground">Senior+</span>
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-black" style="width: {(skillDepth.senior / skillDepth.total) * 100}%"></div>
                </div>
                <span class="text-[10px] font-bold text-foreground">{skillDepth.senior}</span>
              </div>
            {/if}
            {#if skillDepth.mid > 0}
              <div class="flex items-center gap-2">
                <span class="w-12 text-[10px] font-bold text-muted-foreground">Mid</span>
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-accent-foreground" style="width: {(skillDepth.mid / skillDepth.total) * 100}%"></div>
                </div>
                <span class="text-[10px] font-bold text-foreground">{skillDepth.mid}</span>
              </div>
            {/if}
            {#if skillDepth.beginner > 0}
              <div class="flex items-center gap-2">
                <span class="w-12 text-[10px] font-bold text-muted-foreground">Junior</span>
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-muted-foreground" style="width: {(skillDepth.beginner / skillDepth.total) * 100}%"></div>
                </div>
                <span class="text-[10px] font-bold text-foreground">{skillDepth.beginner}</span>
              </div>
            {/if}
          </div>
          <p class="mt-2 text-[10px] font-semibold text-muted-foreground">Tổng: {skillDepth.total} kỹ năng</p>
        {:else}
          <p class="mt-3 text-xs text-muted-foreground">Chưa có kỹ năng được khai báo.</p>
        {/if}
      </div>

      <!-- Review credibility card -->
      <article class="rounded-[24px] border-2 border-black bg-black p-4 text-white shadow-suar-accent">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-white/58">Review credibility</p>
            <p class="mt-2 text-2xl font-black">
              {formatCompactNumber(credibilityMetrics.credibility_score, 1)}
            </p>
          </div>
          <div class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/82">
            <Sparkles class="mr-1 inline size-3" />
            {formatPercent(reviewAccuracy, 1)} review accuracy
          </div>
        </div>

        <div class="mt-4 grid gap-3 grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/52">Reviews given</p>
            <p class="mt-1 text-lg font-black">{formatCompactNumber(credibilityMetrics.total_reviews_given, 0)}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/52">Accurate</p>
            <p class="mt-1 text-lg font-black">{formatCompactNumber(credibilityMetrics.accurate_reviews, 0)}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/52">Disputed</p>
            <p class="mt-1 text-lg font-black">{formatCompactNumber(credibilityMetrics.disputed_reviews, 0)}</p>
          </div>
        </div>
      </article>
    </div>
  </div>
</section>
