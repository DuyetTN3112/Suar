<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

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
    completeness: _completeness,
    spiderChartData,
    deliveryMetrics,
    featuredReviews,
    workHistory,
    currentSnapshot = null,
    auth,
  }: Props = $props()
  const currentOrgRole = $derived(auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()

  const pageTitle = $derived(t('profile.show', {}, 'Hồ sơ cá nhân'))
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)

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

  const neoBrutalCard = 'border border-border rounded-lg p-4 bg-white'
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    {#if flash?.success}
      <div class="rounded-xl border border-black bg-accent px-3 py-2 text-sm font-medium text-foreground">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-xl border-2 border-black bg-black px-3 py-2 text-sm font-medium text-white shadow-suar-accent">
        {flash.error}
      </div>
    {/if}

    <Tabs value="overview" class="w-full">
      <TabsList class="grid w-full grid-cols-4 max-w-2xl">
        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        <TabsTrigger value="skills">Bản đồ năng lực</TabsTrigger>
        <TabsTrigger value="reviews">Đánh giá nổi bật</TabsTrigger>
        <TabsTrigger value="work-history">Kinh nghiệm</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="mt-4 space-y-6">
        <ProfileOverviewSection {user} {deliveryMetrics} {currentSnapshot} />
        <ProfileSnapshotPanel {currentSnapshot} />
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
    </Tabs>
  </div>
</Layout>
