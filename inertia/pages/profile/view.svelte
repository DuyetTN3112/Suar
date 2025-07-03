<script lang="ts">

  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Button from '@/components/ui/button.svelte'
  import ProfileFeaturedReviewsSection from './components/profile_featured_reviews_section.svelte'
  import ProfileSkillsAndChartsSection from './components/profile_skills_and_charts_section.svelte'
  import {
    buildGroupedSkillsByCategory,
    createGroupedSkillsFromSpiderData,
    getUserInitials,
    getUserNumberField,
    getUserStringField,
    normalizeProfileSkillRelation,
  } from './profile_view_helpers'
  import { navigateToProfileEdit, navigateToUserReviews } from './profile_navigation'
  import type { ProfileViewProps } from './types.svelte'

  interface DeliveryMetrics {
    delivery: {
      late_percentage: number
      estimate_accuracy_percentage: number
      tasks_on_time: number
      avg_hours_over_estimate: number
    }
    skill_aggregation: {
      total_skills: number
      reviewed_skills: number
      avg_percentage: number
    }
    years_of_experience: number
    joined_at_formatted: string
  }

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface Props {
    user: ProfileViewProps['user']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
  }

  const {
    user,
    completeness: _completeness,
    spiderChartData,
    isOwnProfile,
    deliveryMetrics,
    featuredReviews,
  }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(isOwnProfile ? t('profile.show', {}, 'Hồ sơ cá nhân') : `${user.username} - Hồ sơ`)

  const userSkills = $derived((user.skills ?? []).map((s) => normalizeProfileSkillRelation(s)))

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

  const totalReviews = $derived(userSkills.reduce((sum, s) => sum + s.total_reviews, 0))

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

  const profileLanguage = $derived(getUserStringField(user as Record<string, unknown>, 'language'))
  const freelancerRating = $derived(
    getUserNumberField(user as Record<string, unknown>, 'freelancer_rating')
  )
  const doneTasks = $derived(
    getUserNumberField(user as Record<string, unknown>, 'freelancer_completed_tasks_count')
  )

  function goToReviews() {
    navigateToUserReviews(user.id)
  }

  function goToEditProfile() {
    navigateToProfileEdit()
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
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

          <p class="text-xs font-semibold text-white/80">
            {user.status_name ?? 'Thành viên'}
            · Hồ sơ tổng hợp toàn bộ tổ chức/dự án
          </p>

          <div class="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div><span class="font-semibold text-white/65">Phạm vi:</span> <span class="text-white">Toàn bộ tổ chức & dự án</span></div>
            <div><span class="font-semibold text-white/65">Kinh nghiệm:</span> <span class="text-white">{deliveryMetrics.years_of_experience} năm</span></div>
            <div><span class="font-semibold text-white/65">Tham gia:</span> <span class="text-white">{deliveryMetrics.joined_at_formatted}</span></div>
            <div><span class="font-semibold text-white/65">Múi giờ:</span> <span class="text-white">{user.timezone ?? 'N/A'}</span></div>
            <div><span class="font-semibold text-white/65">Ngôn ngữ:</span> <span class="text-white">{profileLanguage ?? 'Tiếng Việt'}</span></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div class="{neoMetricCard} bg-background/92 dark:bg-card">
            <p class="text-[10px] font-bold text-muted-foreground">Trust score</p>
            <p class="text-xl font-black text-foreground">{typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : '--'}</p>
          </div>
          <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
            <p class="text-[10px] font-bold text-current/70">Rating</p>
            <p class="text-xl font-black">{typeof freelancerRating === 'number' ? freelancerRating.toFixed(1) : '--'}</p>
          </div>
          <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
            <p class="text-[10px] font-bold text-current/70">Tasks xong</p>
            <p class="text-xl font-black">{doneTasks ?? 0}</p>
          </div>
          <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
            <p class="text-[10px] font-bold text-current/70">Dispute</p>
            <p class="text-xl font-black">0</p>
          </div>
        </div>
      </div>
    </section>

    <div class="flex justify-end gap-2">
      <Button variant="outline" size="sm" onclick={goToReviews}>Xem đánh giá</Button>
      {#if isOwnProfile}
        <Button variant="outline" size="sm" onclick={goToEditProfile}>Chỉnh sửa</Button>
      {/if}
    </div>

    <section class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="{neoMetricCard} bg-orange-100 text-orange-950 dark:bg-orange-950/40 dark:text-orange-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Trễ deadline</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.late_percentage.toFixed(1)}%</p>
      </div>
      <div class="{neoMetricCard} bg-blue-100 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Estimate ok</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.estimate_accuracy_percentage.toFixed(1)}%</p>
      </div>
      <div class="{neoMetricCard} bg-foreground text-background dark:bg-background dark:text-foreground">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Tasks đúng hạn</p>
        <p class="text-2xl font-black">{deliveryMetrics.delivery.tasks_on_time} / {doneTasks ?? 0}</p>
      </div>
      <div class="{neoMetricCard} bg-fuchsia-100 text-fuchsia-950 dark:bg-fuchsia-950/40 dark:text-fuchsia-100">
        <p class="text-[10px] font-bold uppercase tracking-wide text-current/70">Điểm kỹ năng TB</p>
        <p class="text-2xl font-black">{deliveryMetrics.skill_aggregation.avg_percentage.toFixed(1)}%</p>
      </div>
    </section>

    <ProfileSkillsAndChartsSection
      groupedSkills={normalizedGroupedSkills}
      {spiderChartData}
      {neoBrutalCard}
    />

    <ProfileFeaturedReviewsSection
      featuredReviews={featuredReviews}
      reviewedSkillsCount={totalReviews}
    />
  </div>
</AppLayout>
