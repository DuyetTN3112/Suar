<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ProfileFeaturedReviewsSection from './components/profile_featured_reviews_section.svelte'
  import ProfileSkillsAndChartsSection from './components/profile_skills_and_charts_section.svelte'
  import ProfileSnapshotPanel from './components/profile_snapshot_panel.svelte'
  import {
    buildGroupedSkillsByCategory,
    createGroupedSkillsFromSpiderData,
    getUserInitials,
    normalizeProfileSkillRelation,
  } from './profile_view_helpers'
  import type {
    ProfileSnapshotSummary,
    SerializedUserProfile,
    SpiderChartPoint,
  } from './types.svelte'

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

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    level_code: string
    avg_percentage: number
    total_reviews: number
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface SpiderChartData {
    technical: SpiderChartPoint[]
    soft_skills: SpiderChartPoint[]
    delivery: SpiderChartPoint[]
  }

  interface Props {
    user: SerializedUserProfile & Record<string, unknown>
    completeness: number
    spiderChartData: SpiderChartData
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
    currentSnapshot?: ProfileSnapshotSummary | null
  }

  const {
    user,
    completeness: _completeness,
    spiderChartData,
    deliveryMetrics,
    featuredReviews,
    currentSnapshot = null,
  }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('profile.show', {}, 'Hồ sơ cá nhân'))
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)

  // Group skills by category (simple transform - NO business logic)
  const userSkills = $derived((user.skills ?? []).map((skillRelation) => normalizeProfileSkillRelation(skillRelation)))

  const groupedSkills = $derived(() => buildGroupedSkillsByCategory(userSkills))

  const fallbackGroupedSkills = $derived.by(() => {
    const fromSpider = [
      createGroupedSkillsFromSpiderData('technical', spiderChartData.technical),
      createGroupedSkillsFromSpiderData('soft_skill', spiderChartData.soft_skills),
      createGroupedSkillsFromSpiderData('delivery', spiderChartData.delivery),
    ]

    return fromSpider.filter((group) => group.items.length > 0)
  })

  const effectiveGroupedSkills = $derived.by(() => {
    const direct = groupedSkills()
    return direct.length > 0 ? direct : fallbackGroupedSkills
  })

  const normalizedGroupedSkills = $derived(
    effectiveGroupedSkills.map((group) => ({
      code: group.code,
      title: group.title,
      bgClass: group.badgeClass,
      items: group.items,
    }))
  )

  const initials = $derived(getUserInitials(user.username))

  const neoBrutalCard = 'neo-panel p-4'
  const neoMetricCard = 'neo-panel-muted px-3 py-2 text-center'
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    {#if flash?.success}
      <div class="rounded-xl border border-blue-300 bg-blue-100 px-3 py-2 text-sm font-medium text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
        {flash.error}
      </div>
    {/if}

    <section class="neo-hero-orange rounded-[10px] p-4">
      <div class="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-extrabold text-foreground shadow-neo-sm dark:bg-card dark:text-card-foreground">
          {initials}
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xl font-black text-white">{user.username}</span>
            <span class="neo-pill-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <span class="h-1.5 w-1.5 rounded-full bg-white"></span>Đã xác thực
            </span>
          </div>

          <p class="text-xs font-bold text-white/80">
            {user.status_name ?? 'Thành viên'}
            · Hồ sơ tổng hợp toàn bộ tổ chức/dự án
            {#if currentSnapshot}
              · Snapshot v{currentSnapshot.version}
            {/if}
          </p>

          <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Phạm vi</span> <span class="text-xs font-bold text-white">Toàn bộ tổ chức & dự án</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Kinh nghiệm</span> <span class="text-xs font-bold text-white">{deliveryMetrics.years_of_experience} năm</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Tham gia</span> <span class="text-xs font-bold text-white">{deliveryMetrics.joined_at_formatted}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Múi giờ</span> <span class="text-xs font-bold text-white">{user.timezone ?? 'GMT+7'}</span></div>
            <div><span class="text-[9px] font-extrabold uppercase tracking-wider text-white/60">Ngôn ngữ</span> <span class="text-xs font-bold text-white">Tiếng Việt, English</span></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 lg:grid-cols-2 xl:grid-cols-4">
          <div class="{neoMetricCard} bg-background/92 dark:bg-card">
            <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Trust</p>
            <p class="text-xl font-black text-foreground">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '84.2'}</p>
          </div>
          <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Rating</p>
            <p class="text-xl font-black">{typeof user.freelancer_rating === 'number' ? user.freelancer_rating.toFixed(1) : '--'} <span class="text-[11px] font-semibold opacity-80">({deliveryMetrics.skill_aggregation.reviewed_skills})</span></p>
          </div>
          <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Tasks</p>
            <p class="text-xl font-black">{deliveryMetrics.delivery.total_tasks_completed}</p>
          </div>
          <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
            <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Dispute</p>
            <p class="text-xl font-black">0</p>
          </div>
        </div>
      </div>
    </section>

    <ProfileSnapshotPanel currentSnapshot={currentSnapshot} />

    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="{neoMetricCard} bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Trễ deadline</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.late_percentage}%</p>
      </div>
      <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Estimate ok</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.estimate_accuracy_percentage}%</p>
      </div>
      <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Đúng hạn</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.tasks_on_time}/{deliveryMetrics.delivery.total_tasks_completed}</p>
      </div>
      <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Vượt giờ TB</p>
        <p class="text-2xl font-black">+{deliveryMetrics.delivery.avg_hours_over_estimate.toFixed(1)}h</p>
      </div>
    </section>

    <ProfileSkillsAndChartsSection
      groupedSkills={normalizedGroupedSkills}
      {spiderChartData}
      {neoBrutalCard}
    />

    <ProfileFeaturedReviewsSection
      {featuredReviews}
      reviewedSkillsCount={deliveryMetrics.skill_aggregation.reviewed_skills}
    />
  </div>
</AppLayout>
