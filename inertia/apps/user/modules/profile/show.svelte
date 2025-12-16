<script lang="ts">
  import { Link, page } from '@inertiajs/svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'

  import ProfileFeaturedReviewsSection from './components/profile_featured_reviews_section.svelte'
  import ProfileOverviewSection from './components/profile_overview_section.svelte'
  import ProfileSkillsAndChartsSection from './components/profile_skills_and_charts_section.svelte'
  import ProfileSnapshotPanel from './components/profile_snapshot_panel.svelte'
  import ProfileWorkHistorySection from './components/profile_work_history_section.svelte'
  import {
    buildGroupedSkillsByCategory,
    createGroupedSkillsFromSpiderData,
    normalizeProfileSkillRelation,
  } from './profile_view_helpers'
  import type {
    ProfileSnapshotSummary,
    ProfileShowProps,
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
    verified_public_proficiency_code: string
    avg_percentage: number
    total_reviews: number
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface OrgMembershipItem {
    org_name: string
    org_role: string
    joined_at: string
    status: string
  }

  interface ProjectMembershipItem {
    project_name: string
    org_name: string | null
    project_role: string
    start_date: string | null
    end_date: string | null
    visibility: string
  }

  interface WorkHistory {
    organizations: OrgMembershipItem[]
    projects: ProjectMembershipItem[]
  }

  interface Props {
    user: ProfileShowProps['user'] & Record<string, unknown>
    userSkills: ProfileShowProps['userSkills']
    completeness: ProfileShowProps['completeness']
    spiderChartData: ProfileShowProps['spiderChartData']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
    reviewHistory?: ProfileShowProps['reviewHistory']
    workHistory: WorkHistory
    currentSnapshot?: ProfileSnapshotSummary | null
    shellMode?: 'app' | 'organization'
    auth?: {
      user?: {
        current_organization_role?: string | null
      }
    }
  }

  const {
    user,
    userSkills,
    completeness: _completeness,
    spiderChartData,
    deliveryMetrics,
    featuredReviews,
    reviewHistory = null,
    workHistory,
    currentSnapshot = null,
  }: Props = $props()
  
  const { t } = useTranslation()

  const pageTitle = $derived(t('user.profile_show.title', {}, 'Capability dossier'))
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
  let snapshotPanelOpen = $state(false)

  const sectionNav = $derived([
    { label: t('user.profile_show.nav_overview', {}, 'Overview'), href: '#profile-overview' },
    { label: t('user.profile_show.nav_skills', {}, 'Capabilities'), href: '#profile-skills' },
    { label: t('user.profile_show.nav_evidence', {}, 'Evidence'), href: '#profile-evidence' },
    { label: t('user.profile_show.nav_work_history', {}, 'Experience'), href: '#profile-work-history' },
  ])

  // Group skills by category (simple transform - NO business logic)
  const normalizedUserSkills = $derived(userSkills.map((skillRelation) => normalizeProfileSkillRelation(skillRelation)))

  const groupedSkills = $derived(() => buildGroupedSkillsByCategory(normalizedUserSkills))

  const fallbackGroupedSkills = $derived.by(() => {
    const fromSpider = [
      createGroupedSkillsFromSpiderData('technology', spiderChartData.technology),
      createGroupedSkillsFromSpiderData('engineering', spiderChartData.engineering),
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

  const neoBrutalCard = 'border border-border rounded-lg p-4 bg-card'
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8">
    {#if flash?.success}
      <div class="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
        {flash.error}
      </div>
    {/if}

    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_show.eyebrow', {}, 'User workspace / Capability dossier')}</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
      </div>

      <div class="relative flex flex-wrap gap-2">
        <Link href="/profile/edit">
          <Button type="button" variant="outline">{t('user.profile_show.edit', {}, 'Edit')}</Button>
        </Link>
        <Button
          type="button"
          aria-controls="profile-snapshot-popover"
          aria-expanded={snapshotPanelOpen}
          onclick={() => {
            snapshotPanelOpen = !snapshotPanelOpen
          }}
        >
          {t('user.profile_show.create_snapshot', {}, 'Create snapshot')}
        </Button>

        {#if snapshotPanelOpen}
          <div
            id="profile-snapshot-popover"
            data-testid="profile-snapshot-popover"
            class="absolute right-0 top-full z-30 mt-2 max-h-[min(78vh,44rem)] w-[min(calc(100vw-2rem),34rem)] overflow-auto rounded-2xl border border-border bg-background p-2 shadow-suar-lg"
          >
            <ProfileSnapshotPanel {currentSnapshot} />
          </div>
        {/if}
      </div>
    </div>

    <section id="profile-overview" class="scroll-mt-24">
      <ProfileOverviewSection {user} {userSkills} {deliveryMetrics} {currentSnapshot} />
    </section>

    <nav class="sticky top-2 z-10 flex w-full flex-wrap gap-1 rounded-xl border border-border bg-background/95 p-1 shadow-suar-xs backdrop-blur" aria-label="Profile sections">
      {#each sectionNav as item (item.href)}
        <a
          href={item.href}
          class="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold text-foreground transition hover:bg-muted"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <section id="profile-skills" class="scroll-mt-24">
      <ProfileSkillsAndChartsSection
        groupedSkills={normalizedGroupedSkills}
        {spiderChartData}
        {neoBrutalCard}
        showCharts={true}
      />
    </section>

    <section id="profile-evidence" class="scroll-mt-24">
      <ProfileFeaturedReviewsSection
        {featuredReviews}
        {reviewHistory}
        reviewedSkillsCount={deliveryMetrics.skill_aggregation.reviewed_skills}
      />
    </section>

    <section id="profile-work-history" class="scroll-mt-24">
      <ProfileWorkHistorySection {workHistory} />
    </section>
  </div>
</AppLayout>
