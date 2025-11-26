<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import Tabs from '@/apps/org/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/org/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/org/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/org/shared/ui/tabs_trigger.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

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

  type ProfileTab = 'overview' | 'skills' | 'reviews' | 'work-history' | 'snapshot'

  interface Props {
    user: ProfileShowProps['user'] & Record<string, unknown>
    userSkills: ProfileShowProps['userSkills']
    completeness: ProfileShowProps['completeness']
    spiderChartData: ProfileShowProps['spiderChartData']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
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
    workHistory,
    currentSnapshot = null,
  }: Props = $props()
  
  const { t } = useTranslation()

  const pageTitle = $derived(t('user.profile_show.title', {}, 'Capability dossier'))
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
  let activeTab = $state<ProfileTab>('overview')

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

<OrganizationLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
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

      <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as ProfileTab }} class="w-full">
      <TabsList class="grid w-full max-w-3xl grid-cols-5">
        <TabsTrigger value="overview">{t('user.profile_show.nav_overview', {}, 'Overview')}</TabsTrigger>
        <TabsTrigger value="skills">{t('user.profile_show.nav_skills', {}, 'Capabilities')}</TabsTrigger>
        <TabsTrigger value="reviews">{t('user.profile_show.nav_reviews', {}, 'Featured reviews')}</TabsTrigger>
        <TabsTrigger value="work-history">{t('user.profile_show.nav_work_history', {}, 'Experience')}</TabsTrigger>
        <TabsTrigger value="snapshot">{t('user.profile_show.nav_snapshot', {}, 'Snapshot')}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="mt-4 space-y-6">
        <ProfileOverviewSection {user} {userSkills} {deliveryMetrics} {currentSnapshot} />
      </TabsContent>

      <TabsContent value="skills" class="mt-4">
        <ProfileSkillsAndChartsSection
          groupedSkills={normalizedGroupedSkills}
          {spiderChartData}
          {neoBrutalCard}
          showCharts={true}
        />
      </TabsContent>

      <TabsContent value="reviews" class="mt-4">
        <ProfileFeaturedReviewsSection
          {featuredReviews}
          reviewedSkillsCount={deliveryMetrics.skill_aggregation.reviewed_skills}
        />
      </TabsContent>

      <TabsContent value="work-history" class="mt-4">
        <ProfileWorkHistorySection {workHistory} />
      </TabsContent>

      <TabsContent value="snapshot" class="mt-4">
        <ProfileSnapshotPanel {currentSnapshot} />
      </TabsContent>
    </Tabs>
  </div>
</OrganizationLayout>
